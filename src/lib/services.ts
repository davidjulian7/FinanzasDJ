import { and, asc, eq } from "drizzle-orm";
import { isoDate } from "./format";
import { db } from "./db";
import { accounts, cuotas, debts, transactions } from "./db/schema";

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
    if (!input.accountDestinoId) throw new Error("Seleccioná la cuenta destino");
    if (input.accountDestinoId === input.accountId) throw new Error("La cuenta destino no puede ser la misma");
  }
}

function cuentaDe(userId: number, id: number) {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .get();
}

export function crearTransaccion(userId: number, input: TxInput) {
  validar(input);
  const origen = cuentaDe(userId, input.accountId);
  if (!origen) throw new Error("Cuenta no encontrada");
  if (input.tipo === "gasto" || input.tipo === "transferencia") verificarFondos(origen, input.monto);
  let destino = null;
  if (input.tipo === "transferencia" && input.accountDestinoId) {
    destino = cuentaDe(userId, input.accountDestinoId);
    if (!destino) throw new Error("Cuenta destino no encontrada");
  }
  return db.transaction((tx) => {
    tx.update(accounts)
      .set({ saldoActual: origen.saldoActual + input.monto * deltaOrigen(origen, input.tipo) })
      .where(and(eq(accounts.id, origen.id), eq(accounts.userId, userId)))
      .run();
    if (destino) {
      tx.update(accounts)
        .set({ saldoActual: destino.saldoActual + input.monto * deltaDestino(destino) })
        .where(and(eq(accounts.id, destino.id), eq(accounts.userId, userId)))
        .run();
    }
    return tx
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
      .all()[0];
  });
}

export function actualizarTransaccion(userId: number, id: number, input: TxInput) {
  validar(input);
  const actual = db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .get();
  if (!actual) throw new Error("Transacción no encontrada");
  return db.transaction((tx) => {
    revertir(tx, actual);
    const origen = cuentaDe(userId, input.accountId);
    if (!origen) throw new Error("Cuenta no encontrada");
    let destino = null;
    if (input.tipo === "transferencia" && input.accountDestinoId) {
      destino = cuentaDe(userId, input.accountDestinoId);
      if (!destino) throw new Error("Cuenta destino no encontrada");
    }
    if (input.tipo === "gasto" || input.tipo === "transferencia") verificarFondos(origen, input.monto);
    tx.update(accounts)
      .set({ saldoActual: origen.saldoActual + input.monto * deltaOrigen(origen, input.tipo) })
      .where(and(eq(accounts.id, origen.id), eq(accounts.userId, userId)))
      .run();
    if (destino) {
      tx.update(accounts)
        .set({ saldoActual: destino.saldoActual + input.monto * deltaDestino(destino) })
        .where(and(eq(accounts.id, destino.id), eq(accounts.userId, userId)))
        .run();
    }
    tx.update(transactions)
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
      .run();
  });
}

export function eliminarTransaccion(userId: number, id: number) {
  const actual = db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .get();
  if (!actual) throw new Error("Transacción no encontrada");
  db.transaction((tx) => {
    revertir(tx, actual);
    tx.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))).run();
  });
}

type TxLike = typeof transactions.$inferSelect;
type DbSession = Pick<typeof db, "update" | "select">;

function revertir(tx: DbSession, t: TxLike) {
  const origen = tx.select().from(accounts).where(eq(accounts.id, t.accountId)).get();
  if (origen) {
    tx.update(accounts)
      .set({ saldoActual: origen.saldoActual - t.monto * deltaOrigen(origen, t.tipo) })
      .where(eq(accounts.id, origen.id))
      .run();
  }
  if (t.accountDestinoId) {
    const destino = tx.select().from(accounts).where(eq(accounts.id, t.accountDestinoId)).get();
    if (destino) {
      tx.update(accounts)
        .set({ saldoActual: destino.saldoActual - t.monto * deltaDestino(destino) })
        .where(eq(accounts.id, destino.id))
        .run();
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

export function crearCuenta(userId: number, input: AccountInput) {
  if (!input.nombre?.trim()) throw new Error("El nombre es obligatorio");
  return db
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
      color: input.color ?? "#7C3AED",
      icono: input.icono ?? "Wallet",
    })
    .returning({ id: accounts.id })
    .all()[0];
}

export function actualizarCuenta(userId: number, id: number, input: AccountInput) {
  const actual = cuentaDe(userId, id);
  if (!actual) throw new Error("Cuenta no encontrada");
  if (!input.nombre?.trim()) throw new Error("El nombre es obligatorio");
  db.update(accounts)
    .set({
      nombre: input.nombre.trim(),
      tipo: input.tipo,
      saldoActual: input.saldoActual ?? 0,
      limiteCredito: numOrNull(input.limiteCredito),
      fechaCorte: numOrNull(input.fechaCorte),
      fechaPago: numOrNull(input.fechaPago),
      color: input.color ?? "#7C3AED",
      icono: input.icono ?? "Wallet",
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .run();
}

export function eliminarCuenta(userId: number, id: number) {
  const n = db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.accountId, id), eq(transactions.userId, userId)))
    .all().length;
  if (n > 0) throw new Error("Esta cuenta tiene transacciones asociadas. Eliminalas primero.");
  const n2 = db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.accountDestinoId, id), eq(transactions.userId, userId)))
    .all().length;
  if (n2 > 0) throw new Error("Esta cuenta es destino de transferencias. Eliminalas primero.");
  db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId))).run();
}

export function registrarPagoDeuda(
  userId: number,
  debtId: number,
  monto: number,
  cuentaId?: number | null
) {
  const debt = db
    .select()
    .from(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, userId)))
    .get();
  if (!debt) throw new Error("Deuda no encontrada");
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto debe ser mayor a cero");
  if (monto > debt.saldoPendiente + 0.001) throw new Error("El monto supera el saldo pendiente");

  db.transaction((tx) => {
    const nuevoSaldo = Math.round((debt.saldoPendiente - monto) * 100) / 100;
    tx.update(debts).set({ saldoPendiente: nuevoSaldo }).where(and(eq(debts.id, debtId), eq(debts.userId, userId))).run();
    if (cuentaId) {
      const tipo: TxTipo = debt.tipo === "por_pagar" ? "gasto" : "ingreso";
      const cuenta = tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, cuentaId), eq(accounts.userId, userId)))
        .get();
      if (!cuenta) throw new Error("Cuenta no encontrada");
      if (tipo === "gasto") verificarFondos(cuenta, monto);
      tx.update(accounts)
        .set({ saldoActual: cuenta.saldoActual + monto * deltaOrigen(cuenta, tipo) })
        .where(and(eq(accounts.id, cuenta.id), eq(accounts.userId, userId)))
        .run();
      tx.insert(transactions)
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
        .run();
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

export function crearCuota(userId: number, input: CuotaInput) {
  if (!input.descripcion?.trim()) throw new Error("La descripción es obligatoria");
  if (!Number.isFinite(input.monto) || input.monto <= 0) throw new Error("El monto debe ser mayor a cero");
  if (!Number.isInteger(input.meses) || input.meses < 1 || input.meses > 48) {
    throw new Error("Los meses deben ser un número entre 1 y 48");
  }
  if (!Number.isFinite(input.tasaAnual) || input.tasaAnual < 0) throw new Error("La tasa debe ser mayor o igual a cero");
  const cuenta = cuentaDe(userId, input.accountId);
  if (!cuenta) throw new Error("Cuenta no encontrada");
  if (!credito(cuenta)) throw new Error("La compra a meses solo puede registrarse en una tarjeta de crédito");
  const { cuota, total } = calcularCuota(input.monto, input.meses, input.tasaAnual);

  const gasto = crearTransaccion(userId, {
    descripcion: `${input.descripcion.trim()} (a ${input.meses} meses)`,
    monto: input.monto,
    tipo: "gasto",
    accountId: input.accountId,
    categoryId: input.categoryId ?? null,
    fecha: input.fecha || isoDate(new Date()),
    notas: `Compra a meses · ${input.meses} meses${input.tasaAnual > 0 ? ` · ${input.tasaAnual}% anual` : " · sin intereses"}`,
  });
  const row = db
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
    .all()[0];
  return { id: row.id, cuota, total, transactionId: gasto.id };
}

// Aplica un pago de tarjeta a las compras a meses: marca como pagadas las cuotas
// completas que el monto alcanza a cubrir, empezando por la compra más antigua.
export function pagarCuotasConMonto(
  userId: number,
  accountId: number,
  monto: number
): { marcadas: number; montoAplicado: number; detalle: { id: number; descripcion: string; marcadas: number; cuota: number }[] } {
  const planes = db
    .select()
    .from(cuotas)
    .where(and(eq(cuotas.accountId, accountId), eq(cuotas.userId, userId)))
    .orderBy(asc(cuotas.fecha), asc(cuotas.id))
    .all()
    .filter((c) => c.pagadas < c.meses);
  let restante = redondear(monto);
  const detalle: { id: number; descripcion: string; marcadas: number; cuota: number }[] = [];
  let marcadas = 0;
  for (const p of planes) {
    if (restante <= 0) break;
    const restantes = p.meses - p.pagadas;
    const pagables = Math.min(restantes, Math.floor((restante + 0.0001) / p.cuota));
    if (pagables <= 0) continue;
    db.update(cuotas).set({ pagadas: p.pagadas + pagables }).where(and(eq(cuotas.id, p.id), eq(cuotas.userId, userId))).run();
    restante = redondear(restante - pagables * p.cuota);
    marcadas += pagables;
    detalle.push({ id: p.id, descripcion: p.descripcion, marcadas: pagables, cuota: p.cuota });
  }
  return { marcadas, montoAplicado: redondear(monto - restante), detalle };
}

export function pagarCuota(userId: number, id: number, cuentaPagoId: number) {
  const cuota = db
    .select()
    .from(cuotas)
    .where(and(eq(cuotas.id, id), eq(cuotas.userId, userId)))
    .get();
  if (!cuota) throw new Error("Compra a meses no encontrada");
  if (cuota.pagadas >= cuota.meses) throw new Error("Todas las cuotas ya fueron pagadas");
  const origen = cuentaDe(userId, cuentaPagoId);
  if (!origen) throw new Error("Cuenta de pago no encontrada");
  if (credito(origen)) throw new Error("La cuenta de pago debe ser de débito");

  const tx = crearTransaccion(userId, {
    descripcion: `Pago cuota ${cuota.pagadas + 1}/${cuota.meses}: ${cuota.descripcion}`,
    monto: cuota.cuota,
    tipo: "transferencia",
    accountId: cuentaPagoId,
    accountDestinoId: cuota.accountId,
    categoryId: null,
    fecha: isoDate(new Date()),
    notas: `Cuota de compra a meses`,
  });

  db.update(cuotas).set({ pagadas: cuota.pagadas + 1 }).where(and(eq(cuotas.id, id), eq(cuotas.userId, userId))).run();
  return { transactionId: tx.id, pagadas: cuota.pagadas + 1 };
}

export function eliminarCuota(userId: number, id: number) {
  const cuota = db
    .select()
    .from(cuotas)
    .where(and(eq(cuotas.id, id), eq(cuotas.userId, userId)))
    .get();
  if (!cuota) throw new Error("Compra a meses no encontrada");
  if (cuota.pagadas > 0) throw new Error("No se puede eliminar: ya hay cuotas pagadas");
  db.delete(cuotas).where(and(eq(cuotas.id, id), eq(cuotas.userId, userId))).run();
  eliminarTransaccion(userId, cuota.transactionId);
}