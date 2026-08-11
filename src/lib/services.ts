import { eq } from "drizzle-orm";
import { isoDate } from "./format";
import { db } from "./db";
import { accounts, debts, transactions } from "./db/schema";

export type TxTipo = "gasto" | "ingreso" | "transferencia";

export interface TxInput {
  descripcion: string;
  monto: number;
  tipo: TxTipo;
  accountId: number;
  accountDestinoId?: number | null;
  categoryId?: number | null;
  fecha: string;
  notas?: string | null;
}

function credito(acct: { tipo: string }) {
  return acct.tipo === "credito";
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

export function crearTransaccion(input: TxInput) {
  validar(input);
  const origen = db.select().from(accounts).where(eq(accounts.id, input.accountId)).get();
  if (!origen) throw new Error("Cuenta no encontrada");
  let destino = null;
  if (input.tipo === "transferencia" && input.accountDestinoId) {
    destino = db.select().from(accounts).where(eq(accounts.id, input.accountDestinoId)).get();
    if (!destino) throw new Error("Cuenta destino no encontrada");
  }
  return db.transaction((tx) => {
    tx.update(accounts)
      .set({ saldoActual: origen.saldoActual + input.monto * deltaOrigen(origen, input.tipo) })
      .where(eq(accounts.id, origen.id))
      .run();
    if (destino) {
      tx.update(accounts)
        .set({ saldoActual: destino.saldoActual + input.monto * deltaDestino(destino) })
        .where(eq(accounts.id, destino.id))
        .run();
    }
    return tx
      .insert(transactions)
      .values({
        descripcion: input.descripcion.trim(),
        monto: input.monto,
        tipo: input.tipo,
        accountId: input.accountId,
        accountDestinoId: input.accountDestinoId ?? null,
        categoryId: input.categoryId ?? null,
        fecha: input.fecha,
        notas: input.notas?.trim() || null,
      })
      .returning({ id: transactions.id })
      .all()[0];
  });
}

export function actualizarTransaccion(id: number, input: TxInput) {
  validar(input);
  const actual = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!actual) throw new Error("Transacción no encontrada");
  return db.transaction((tx) => {
    revertir(tx, actual);
    const origen = tx.select().from(accounts).where(eq(accounts.id, input.accountId)).get()!;
    let destino = null;
    if (input.tipo === "transferencia" && input.accountDestinoId) {
      destino = tx.select().from(accounts).where(eq(accounts.id, input.accountDestinoId)).get()!;
      if (!destino) throw new Error("Cuenta destino no encontrada");
    }
    tx.update(accounts)
      .set({ saldoActual: origen.saldoActual + input.monto * deltaOrigen(origen, input.tipo) })
      .where(eq(accounts.id, origen.id))
      .run();
    if (destino) {
      tx.update(accounts)
        .set({ saldoActual: destino.saldoActual + input.monto * deltaDestino(destino) })
        .where(eq(accounts.id, destino.id))
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
        fecha: input.fecha,
        notas: input.notas?.trim() || null,
      })
      .where(eq(transactions.id, id))
      .run();
  });
}

export function eliminarTransaccion(id: number) {
  const actual = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!actual) throw new Error("Transacción no encontrada");
  db.transaction((tx) => {
    revertir(tx, actual);
    tx.delete(transactions).where(eq(transactions.id, id)).run();
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

export function crearCuenta(input: AccountInput) {
  if (!input.nombre?.trim()) throw new Error("El nombre es obligatorio");
  return db
    .insert(accounts)
    .values({
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

export function actualizarCuenta(id: number, input: AccountInput) {
  const actual = db.select().from(accounts).where(eq(accounts.id, id)).get();
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
    .where(eq(accounts.id, id))
    .run();
}

export function eliminarCuenta(id: number) {
  const n = db.select({ id: transactions.id }).from(transactions).where(eq(transactions.accountId, id)).all().length;
  if (n > 0) throw new Error("Esta cuenta tiene transacciones asociadas. Eliminalas primero.");
  const n2 = db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.accountDestinoId, id))
    .all().length;
  if (n2 > 0) throw new Error("Esta cuenta es destino de transferencias. Eliminalas primero.");
  db.delete(accounts).where(eq(accounts.id, id)).run();
}

export function registrarPagoDeuda(
  debtId: number,
  monto: number,
  cuentaId?: number | null
) {
  const debt = db.select().from(debts).where(eq(debts.id, debtId)).get();
  if (!debt) throw new Error("Deuda no encontrada");
  if (!Number.isFinite(monto) || monto <= 0) throw new Error("El monto debe ser mayor a cero");
  if (monto > debt.saldoPendiente + 0.001) throw new Error("El monto supera el saldo pendiente");

  db.transaction((tx) => {
    const nuevoSaldo = Math.round((debt.saldoPendiente - monto) * 100) / 100;
    tx.update(debts).set({ saldoPendiente: nuevoSaldo }).where(eq(debts.id, debtId)).run();
    if (cuentaId) {
      const tipo: TxTipo = debt.tipo === "por_pagar" ? "gasto" : "ingreso";
      const cuenta = tx.select().from(accounts).where(eq(accounts.id, cuentaId)).get();
      if (!cuenta) throw new Error("Cuenta no encontrada");
      tx.update(accounts)
        .set({ saldoActual: cuenta.saldoActual + monto * deltaOrigen(cuenta, tipo) })
        .where(eq(accounts.id, cuenta.id))
        .run();
      tx.insert(transactions)
        .values({
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
