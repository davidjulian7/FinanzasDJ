import { and, asc, eq } from "drizzle-orm";
import { isoDate } from "./format";
import { db } from "./db";
import { accounts, apartados, cuotas, debts, recurringExpenses, transactions } from "./db/schema";

export type TxTipo = "gasto" | "ingreso" | "transferencia";

export interface TxInput {
  descripcion: string;
  monto: number;
  tipo: TxTipo;
  accountId: number;
  accountDestinoId?: number | null;
  categoryId?: number | null;
  apartadoId?: number | null;
  fecha: string;
  notas?: string | null;
}

function credito(acct: { tipo: string }) {
  return acct.tipo === "credito";
}

// Dinero disponible para gastar en una cuenta.
// Crédito: disponible = límite − deuda (deuda = saldo si es positivo; si el saldo es
// negativo, ese monto ya se interpreta como "disponible" a favor).
export function disponibleEn(acct: { tipo: string; saldoActual: number; limiteCredito: number | null }): number | null {
  if (!credito(acct)) return acct.saldoActual;
  if (acct.saldoActual < 0) return Math.abs(acct.saldoActual);
  if (acct.limiteCredito == null) return null; // sin límite cargado no se puede validar
  return Math.max(0, acct.limiteCredito - acct.saldoActual);
}

// Verifica si una cuenta puede cubrir un egreso (gasto o transferencia origen).
function verificarFondos(
  acct: { tipo: string; saldoActual: number; limiteCredito: number | null; nombre: string },
  monto: number
) {
  const disp = disponibleEn(acct);
  if (disp == null) return; // sin límite de crédito no se puede validar
  if (monto > disp + 0.001) {
    if (credito(acct)) {
      throw new Error(`Crédito insuficiente en "${acct.nombre}" (disponible: ${fmt(disp)}).`);
    }
    throw new Error(`Saldo insuficiente en "${acct.nombre}" (saldo: ${fmt(disp)}).`);
  }
}

function fmt(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
}

function deltaOrigen(acct: { tipo: string }, tipo: TxTipo): number {
  if (tipo === "ingreso") return credito(acct) ? -1 : 1;
  if (tipo === "gasto") return credito(acct) ? 1 : -1;
  return -1;
}

// Transferencia hacia una cuenta de crédito = pago de tarjeta: reduce la deuda.
function deltaDestino(acct: { tipo: string }): number {
  return credito(acct) ? -1 : 1;
}

function validar(input: TxInput) {
  if (!input.descripcion?.trim()) throw new Error("La descripción es obligatoria");
  if (!Number.isFinite(input.monto) || input.monto <= 0) throw new Error("El monto debe ser mayor a cero");
  if (!input.fecha) throw new Error("La fecha es obligatoria");
  if (input.tipo === "transferencia") {
    if (!input.accountDestinoId) throw new Error("Selecciona la cuenta destino");
    if (input.accountDestinoId === input.accountId) throw new Error("La cuenta destino no puede ser la misma");
  }
}

async function cuentaDe(userId: string, id: number) {
  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .execute();
  return rows[0] ?? null;
}

export function validarMonto(v: unknown, mensaje = "El monto debe ser mayor a cero"): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error(mensaje);
  return n;
}

export async function crearTransaccion(userId: string, input: TxInput) {
  validar(input);
  return db.transaction(async (tx) => {
    const [origenLocked] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)))
      .for("update")
      .execute();
    if (!origenLocked) throw new Error("Cuenta no encontrada");
    if (input.tipo === "gasto" || input.tipo === "transferencia") verificarFondos(origenLocked, input.monto);
    let destinoLocked = null;
    if (input.tipo === "transferencia" && input.accountDestinoId) {
      [destinoLocked] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, input.accountDestinoId), eq(accounts.userId, userId)))
        .for("update")
        .execute();
      if (!destinoLocked) throw new Error("Cuenta destino no encontrada");
    }
    await tx
      .update(accounts)
      .set({ saldoActual: origenLocked.saldoActual + input.monto * deltaOrigen(origenLocked, input.tipo) })
      .where(and(eq(accounts.id, origenLocked.id), eq(accounts.userId, userId)))
      .execute();
    if (destinoLocked) {
      await tx
        .update(accounts)
        .set({ saldoActual: destinoLocked.saldoActual + input.monto * deltaDestino(destinoLocked) })
        .where(and(eq(accounts.id, destinoLocked.id), eq(accounts.userId, userId)))
        .execute();
    }
    const rows = await tx
      .insert(transactions)
      .values({
        userId,
        descripcion: input.descripcion.trim(),
        monto: input.monto,
        tipo: input.tipo,
        accountId: input.accountId,
        accountDestinoId: input.accountDestinoId ?? null,
        categoryId: input.categoryId ?? null,
        apartadoId: input.apartadoId ?? null,
        fecha: input.fecha,
        notas: input.notas?.trim() || null,
      })
      .returning({ id: transactions.id })
      .execute();
    return rows[0];
  });
}

export async function actualizarTransaccion(userId: string, id: number, input: TxInput) {
  validar(input);
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .execute();
  const actual = rows[0];
  if (!actual) throw new Error("Transacción no encontrada");
  return db.transaction(async (tx) => {
    await revertir(tx, actual);
    const [origen] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)))
      .for("update")
      .execute();
    if (!origen) throw new Error("Cuenta no encontrada");
    let destino = null;
    if (input.tipo === "transferencia" && input.accountDestinoId) {
      [destino] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, input.accountDestinoId), eq(accounts.userId, userId)))
        .for("update")
        .execute();
      if (!destino) throw new Error("Cuenta destino no encontrada");
    }
    if (input.tipo === "gasto" || input.tipo === "transferencia") verificarFondos(origen, input.monto);
    await tx
      .update(accounts)
      .set({ saldoActual: origen.saldoActual + input.monto * deltaOrigen(origen, input.tipo) })
      .where(and(eq(accounts.id, origen.id), eq(accounts.userId, userId)))
      .execute();
    if (destino) {
      await tx
        .update(accounts)
        .set({ saldoActual: destino.saldoActual + input.monto * deltaDestino(destino) })
        .where(and(eq(accounts.id, destino.id), eq(accounts.userId, userId)))
        .execute();
    }
    await tx
      .update(transactions)
      .set({
        descripcion: input.descripcion.trim(),
        monto: input.monto,
        tipo: input.tipo,
        accountId: input.accountId,
        accountDestinoId: input.accountDestinoId ?? null,
        categoryId: input.categoryId ?? null,
        apartadoId: input.apartadoId ?? null,
        fecha: input.fecha,
        notas: input.notas?.trim() || null,
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .execute();
  });
}

export async function eliminarTransaccion(userId: string, id: number) {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .execute();
  const actual = rows[0];
  if (!actual) throw new Error("Transacción no encontrada");
  await db.transaction(async (tx) => {
    await revertir(tx, actual);
    await tx.delete(cuotas).where(and(eq(cuotas.transactionId, id), eq(cuotas.userId, userId))).execute();
    await tx.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).execute();
  });
}

type TxLike = typeof transactions.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function revertir(tx: Tx, t: TxLike) {
  const origenRows = await tx.select().from(accounts).where(eq(accounts.id, t.accountId)).for("update").execute();
  const origen = origenRows[0];
  if (origen) {
    await tx
      .update(accounts)
      .set({ saldoActual: origen.saldoActual - t.monto * deltaOrigen(origen, t.tipo) })
      .where(eq(accounts.id, origen.id))
      .execute();
  }
  if (t.accountDestinoId) {
    const destinoRows = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, t.accountDestinoId))
      .for("update")
      .execute();
    const destino = destinoRows[0];
    if (destino) {
      await tx
        .update(accounts)
        .set({ saldoActual: destino.saldoActual - t.monto * deltaDestino(destino) })
        .where(eq(accounts.id, destino.id))
        .execute();
    }
  }
}

export interface AccountInput {
  nombre: string;
  tipo: "debito" | "credito" | "efectivo" | "inversion";
  saldoActual: number;
  limiteCredito?: number | string | null;
  fechaCorte?: number | string | null;
  fechaPago?: number | string | null;
  color: string;
  icono: string;
}

function numOrNull(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function crearCuenta(userId: string, input: AccountInput) {
  if (!input.nombre?.trim()) throw new Error("El nombre es obligatorio");
  if (!Number.isFinite(input.saldoActual)) throw new Error("El saldo actual no es válido");
  const rows = await db
    .insert(accounts)
    .values({
      userId,
      nombre: input.nombre.trim(),
      tipo: input.tipo,
      saldoActual: input.saldoActual ?? 0,
      saldoInicial: input.saldoActual ?? 0,
      limiteCredito: numOrNull(input.limiteCredito),
      fechaCorte: numOrNull(input.fechaCorte),
      fechaPago: numOrNull(input.fechaPago),
      color: input.color ?? "#2D3748",
      icono: input.icono ?? "Wallet",
    })
    .returning({ id: accounts.id })
    .execute();
  return rows[0];
}

export async function actualizarCuenta(userId: string, id: number, input: AccountInput) {
  const actual = await cuentaDe(userId, id);
  if (!actual) throw new Error("Cuenta no encontrada");
  if (!input.nombre?.trim()) throw new Error("El nombre es obligatorio");
  if (!Number.isFinite(input.saldoActual)) throw new Error("El saldo actual no es válido");
  await db
    .update(accounts)
    .set({
      nombre: input.nombre.trim(),
      tipo: input.tipo,
      saldoActual: input.saldoActual ?? 0,
      limiteCredito: numOrNull(input.limiteCredito),
      fechaCorte: numOrNull(input.fechaCorte),
      fechaPago: numOrNull(input.fechaPago),
      color: input.color ?? "#2D3748",
      icono: input.icono ?? "Wallet",
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .execute();
}

export async function eliminarCuenta(userId: string, id: number) {
  const n = (
    await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.accountId, id), eq(transactions.userId, userId)))
      .execute()
  ).length;
  if (n > 0) throw new Error("Esta cuenta tiene transacciones asociadas. Elimínalas primero.");
  const n2 = (
    await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.accountDestinoId, id), eq(transactions.userId, userId)))
      .execute()
  ).length;
  if (n2 > 0) throw new Error("Esta cuenta es destino de transferencias. Elimínalas primero.");
  const n3 = (
    await db
      .select({ id: recurringExpenses.id })
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.accountId, id), eq(recurringExpenses.userId, userId)))
      .execute()
  ).length;
  if (n3 > 0) throw new Error("Esta cuenta tiene gastos recurrentes asociados. Elimínalos primero.");
  const n4 = (
    await db
      .select({ id: apartados.id })
      .from(apartados)
      .where(and(eq(apartados.cuentaId, id), eq(apartados.userId, userId)))
      .execute()
  ).length;
  if (n4 > 0) throw new Error("Esta cuenta tiene apartados asociados. Elimínalos primero.");
  const n5 = (
    await db
      .select({ id: cuotas.id })
      .from(cuotas)
      .where(and(eq(cuotas.accountId, id), eq(cuotas.userId, userId)))
      .execute()
  ).length;
  if (n5 > 0) throw new Error("Esta cuenta tiene compras a meses asociadas. Elimínalas primero.");
  await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId))).execute();
}

export async function registrarPagoDeuda(
  userId: string,
  debtId: number,
  monto: number,
  cuentaId?: number | null
) {
  const debtRows = await db
    .select()
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .execute();
  const debt = debtRows[0];
  if (!debt) throw new Error("Deuda no encontrada");
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto debe ser mayor a cero");
  if (monto > debt.saldoPendiente + 0.001) throw new Error("El monto supera el saldo pendiente");

  await db.transaction(async (tx) => {
    const nuevoSaldo = Math.round((debt.saldoPendiente - monto) * 100) / 100;
    await tx.update(debts).set({ saldoPendiente: nuevoSaldo }).where(and(eq(debts.id, debtId), eq(debts.userId, userId))).execute();
    if (cuentaId) {
      const tipo: TxTipo = debt.tipo === "por_pagar" ? "gasto" : "ingreso";
      const cuentaRows = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, cuentaId), eq(accounts.userId, userId)))
        .execute();
      const cuenta = cuentaRows[0];
      if (!cuenta) throw new Error("Cuenta no encontrada");
      if (tipo === "gasto") verificarFondos(cuenta, monto);
      await tx
        .update(accounts)
        .set({ saldoActual: cuenta.saldoActual + monto * deltaOrigen(cuenta, tipo) })
        .where(and(eq(accounts.id, cuenta.id), eq(accounts.userId, userId)))
        .execute();
      await tx
        .insert(transactions)
        .values({
          userId,
          descripcion: `${debt.tipo === "por_pagar" ? "Pago de deuda" : "Cobro de deuda"}: ${debt.nombre}`,
          monto,
          tipo,
          accountId: cuenta.id,
          categoryId: null,
          fecha: isoDate(new Date()),
          notas: `Deuda: ${debt.nombre}`,
        })
        .execute();
    }
  });
}

export interface CuotaInput {
  accountId: number;
  descripcion: string;
  monto: number;
  meses: number;
  tasaAnual: number; // % anual, 0 = sin intereses
  fecha: string;
  categoryId?: number | null;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

// Cuota fija mensual (amortización francesa). tasaAnual 0 → meses sin intereses.
export function calcularCuota(monto: number, meses: number, tasaAnual: number): { cuota: number; total: number } {
  if (meses <= 0) throw new Error("La cantidad de meses debe ser mayor a cero");
  if (tasaAnual <= 0) {
    const cuota = redondear(monto / meses);
    return { cuota, total: redondear(cuota * meses) };
  }
  const r = tasaAnual / 100 / 12;
  const factor = Math.pow(1 + r, meses);
  const cuota = redondear((monto * r * factor) / (factor - 1));
  return { cuota, total: redondear(cuota * meses) };
}

export async function crearCuota(userId: string, input: CuotaInput) {
  if (!input.descripcion?.trim()) throw new Error("La descripción es obligatoria");
  if (!Number.isFinite(input.monto) || input.monto <= 0) throw new Error("El monto debe ser mayor a cero");
  if (!Number.isInteger(input.meses) || input.meses < 1 || input.meses > 48) {
    throw new Error("Los meses deben ser un número entre 1 y 48");
  }
  if (!Number.isFinite(input.tasaAnual) || input.tasaAnual < 0) throw new Error("La tasa debe ser mayor o igual a cero");
  const cuenta = await cuentaDe(userId, input.accountId);
  if (!cuenta) throw new Error("Cuenta no encontrada");
  if (!credito(cuenta)) throw new Error("La compra a meses solo puede registrarse en una tarjeta de crédito");
  const { cuota, total } = calcularCuota(input.monto, input.meses, input.tasaAnual);

  const gasto = await crearTransaccion(userId, {
    descripcion: `${input.descripcion.trim()} (a ${input.meses} meses)`,
    monto: input.monto,
    tipo: "gasto",
    accountId: input.accountId,
    categoryId: input.categoryId ?? null,
    fecha: input.fecha || isoDate(new Date()),
    notas: `Compra a meses · ${input.meses} meses${input.tasaAnual > 0 ? ` · ${input.tasaAnual}% anual` : " · sin intereses"}`,
  });
  const rows = await db
    .insert(cuotas)
    .values({
      userId,
      accountId: input.accountId,
      descripcion: input.descripcion.trim(),
      monto: input.monto,
      meses: input.meses,
      tasaAnual: input.tasaAnual,
      cuota,
      total,
      pagadas: 0,
      fecha: input.fecha || isoDate(new Date()),
      transactionId: gasto.id,
    })
    .returning({ id: cuotas.id })
    .execute();
  return { id: rows[0].id, cuota, total, transactionId: gasto.id };
}

// Aplica un pago de tarjeta a las compras a meses: marca como pagadas las cuotas
// completas que el monto alcanza a cubrir, empezando por la compra más antigua.
export async function pagarCuotasConMonto(
  userId: string,
  accountId: number,
  monto: number
): Promise<{ marcadas: number; montoAplicado: number; detalle: { id: number; descripcion: string; marcadas: number; cuota: number }[] }> {
  validarMonto(monto);
  const detalle: { id: number; descripcion: string; marcadas: number; cuota: number }[] = [];
  return db.transaction(async (tx) => {
    const planes = (
      await tx
        .select()
        .from(cuotas)
        .where(and(eq(cuotas.accountId, accountId), eq(cuotas.userId, userId)))
        .orderBy(asc(cuotas.fecha), asc(cuotas.id))
        .for("update")
        .execute()
    ).filter((c) => c.pagadas < c.meses);
    let restante = redondear(monto);
    let marcadas = 0;
    for (const p of planes) {
      if (restante <= 0) break;
      const restantes = p.meses - p.pagadas;
      const pagables = Math.min(restantes, Math.floor((restante + 0.0001) / p.cuota));
      if (pagables <= 0) continue;
      await tx.update(cuotas).set({ pagadas: p.pagadas + pagables }).where(and(eq(cuotas.id, p.id), eq(cuotas.userId, userId))).execute();
      restante = redondear(restante - pagables * p.cuota);
      marcadas += pagables;
      detalle.push({ id: p.id, descripcion: p.descripcion, marcadas: pagables, cuota: p.cuota });
    }
    return { marcadas, montoAplicado: redondear(monto - restante), detalle };
  });
}

export async function pagarCuota(userId: string, id: number, cuentaPagoId: number) {
  return db.transaction(async (tx) => {
    const cuotaRows = await tx
      .select()
      .from(cuotas)
      .where(and(eq(cuotas.id, id), eq(cuotas.userId, userId)))
      .for("update")
      .execute();
    const cuota = cuotaRows[0];
    if (!cuota) throw new Error("Compra a meses no encontrada");
    if (cuota.pagadas >= cuota.meses) throw new Error("Todas las cuotas ya fueron pagadas");
    const [origen] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, cuentaPagoId), eq(accounts.userId, userId)))
      .for("update")
      .execute();
    if (!origen) throw new Error("Cuenta de pago no encontrada");
    if (credito(origen)) throw new Error("La cuenta de pago debe ser de débito");
    const [destino] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, cuota.accountId), eq(accounts.userId, userId)))
      .for("update")
      .execute();
    if (!destino) throw new Error("Cuenta de la compra no encontrada");

    verificarFondos(origen, cuota.cuota);

    await tx
      .update(accounts)
      .set({ saldoActual: origen.saldoActual - cuota.cuota })
      .where(and(eq(accounts.id, origen.id), eq(accounts.userId, userId)))
      .execute();
    await tx
      .update(accounts)
      .set({ saldoActual: destino.saldoActual - cuota.cuota * deltaDestino(destino) })
      .where(and(eq(accounts.id, destino.id), eq(accounts.userId, userId)))
      .execute();

    const txRows = await tx
      .insert(transactions)
      .values({
        userId,
        descripcion: `Pago cuota ${cuota.pagadas + 1}/${cuota.meses}: ${cuota.descripcion}`,
        monto: cuota.cuota,
        tipo: "transferencia",
        accountId: cuentaPagoId,
        accountDestinoId: cuota.accountId,
        categoryId: null,
        fecha: isoDate(new Date()),
        notas: `Cuota de compra a meses`,
      })
      .returning({ id: transactions.id })
      .execute();

    await tx.update(cuotas).set({ pagadas: cuota.pagadas + 1 }).where(and(eq(cuotas.id, id), eq(cuotas.userId, userId))).execute();
    return { transactionId: txRows[0].id, pagadas: cuota.pagadas + 1 };
  });
}

export async function eliminarCuota(userId: string, id: number) {
  return db.transaction(async (tx) => {
    const cuotaRows = await tx
      .select()
      .from(cuotas)
      .where(and(eq(cuotas.id, id), eq(cuotas.userId, userId)))
      .for("update")
      .execute();
    const cuota = cuotaRows[0];
    if (!cuota) throw new Error("Compra a meses no encontrada");
    if (cuota.pagadas > 0) throw new Error("No se puede eliminar: ya hay cuotas pagadas");
    const txRows = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, cuota.transactionId), eq(transactions.userId, userId)))
      .execute();
    const transaccion = txRows[0];
    if (transaccion) {
      await revertir(tx, transaccion);
      await tx.delete(transactions).where(and(eq(transactions.id, transaccion.id), eq(transactions.userId, userId))).execute();
    }
    await tx.delete(cuotas).where(and(eq(cuotas.id, id), eq(cuotas.userId, userId))).execute();
  });
}