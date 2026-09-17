import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { calcularDiferenciaAjuste, resumirAjuste } = loadTs("src/lib/ajuste-calculos.ts");

function ajusteDb(cuentas, { lastDate, failTransaction = false } = {}) {
  const schema = Object.fromEntries(["accounts", "settings", "expenseCategories", "transactions"].map((name) =>
    [name, { name, id: "id", userId: "userId", key: "key", value: "value", nombre: "nombre" }]
  ));
  let saved = {
    accounts: cuentas.map((cuenta) => ({ ...cuenta, userId: "user" })),
    settings: lastDate ? [{ userId: "user", key: "ultimo_ajuste_fecha", value: JSON.stringify(lastDate) }] : [],
    expenseCategories: [],
    transactions: [],
  };
  const locks = [];
  const db = {
    select() { throw new Error("La lectura del ajuste debe estar dentro de la transacción"); },
    insert() { throw new Error("La escritura del ajuste debe estar dentro de la transacción"); },
    async transaction(callback) {
      const draft = structuredClone(saved);
      function query(operation, initialTable) {
        let table = initialTable;
        let values;
        let predicate = () => true;
        const builder = {
          from(value) { table = value; return builder; },
          where(value) { predicate = value; return builder; },
          orderBy() { return builder; },
          for(value) { locks.push([table.name, value]); return builder; },
          values(value) { values = value; return builder; },
          set(value) { values = value; return builder; },
          returning() { return builder; },
          onConflictDoUpdate() { return builder; },
          async execute() {
            if (operation === "select") return draft[table.name].filter(predicate);
            if (operation === "update") {
              draft[table.name].filter(predicate).forEach((row) => Object.assign(row, values));
              return [];
            }
            if (table.name === "transactions" && failTransaction) throw new Error("fallo al registrar movimiento");
            const row = { id: draft[table.name].length + 1, ...values };
            draft[table.name].push(row);
            return [row];
          },
        };
        return builder;
      }
      const result = await callback({
        select: () => query("select"),
        insert: (table) => query("insert", table),
        update: (table) => query("update", table),
      });
      saved = draft;
      return result;
    },
  };
  const ajuste = loadTs("src/lib/ajuste.ts", { mocks: {
    "./db": { db },
    "./db/schema": schema,
    "drizzle-orm": {
      eq: (field, value) => (row) => row[field] === value,
      and: (...predicates) => (row) => predicates.every((predicate) => predicate(row)),
    },
  } });
  return { ...ajuste, saved: () => saved, locks };
}

test("el resumen muestra gastos e ingresos aunque la diferencia neta sea cero", () => {
  assert.deepEqual(resumirAjuste([-200, 200, 0]), {
    transaccionesCreadas: 2, diferenciaTotal: 0, totalGastos: 200, totalIngresos: 200,
  });
  assert.equal(calcularDiferenciaAjuste("debito", 0.3, 0.29), -0.01);
  assert.equal(calcularDiferenciaAjuste("credito", 0.29, 0.3), -0.01);
});

test("guarda exactamente el saldo real, incluso cuando aumenta la deuda de TDC", async () => {
  const db = ajusteDb([
    { id: 1, nombre: "BBVA", tipo: "debito", saldoActual: 1000 },
    { id: 2, nombre: "TDC BBVA", tipo: "credito", saldoActual: 100 },
    { id: 3, nombre: "MP", tipo: "debito", saldoActual: 20 },
    { id: 4, nombre: "TDC MP", tipo: "credito", saldoActual: 300 },
  ]);
  const result = await db.procesarAjuste("user", { fecha: "2026-09-17", cuentas: [
    { cuentaId: 1, saldoReal: 800 }, { cuentaId: 2, saldoReal: 400 },
    { cuentaId: 3, saldoReal: 320 }, { cuentaId: 4, saldoReal: 100 },
  ] });
  assert.deepEqual(db.saved().accounts.map((row) => row.saldoActual), [800, 400, 320, 100]);
  assert.deepEqual(db.saved().transactions.map(({ tipo, monto }) => ({ tipo, monto })), [
    { tipo: "gasto", monto: 200 }, { tipo: "gasto", monto: 300 },
    { tipo: "ingreso", monto: 300 }, { tipo: "ingreso", monto: 200 },
  ]);
  assert.deepEqual(result, { transaccionesCreadas: 4, diferenciaTotal: 0, totalGastos: 500, totalIngresos: 500 });
  assert.deepEqual(db.locks, [["accounts", "update"]]);
});

test("un fallo no deja saldos, categorías ni fecha del ajuste guardados a medias", async () => {
  const db = ajusteDb([{ id: 1, nombre: "BBVA", tipo: "debito", saldoActual: 1000 }], { failTransaction: true });
  const before = structuredClone(db.saved());
  await assert.rejects(db.procesarAjuste("user", { fecha: "2026-09-17", cuentas: [{ cuentaId: 1, saldoReal: 800 }] }));
  assert.deepEqual(db.saved(), before);
});

test("un ajuste repetido produce un conflicto reconocible, no un error 500", async () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const db = ajusteDb([{ id: 1, nombre: "BBVA", tipo: "debito", saldoActual: 1000 }], { lastDate: today });
  await assert.rejects(db.procesarAjuste("user", { fecha: today, cuentas: [{ cuentaId: 1, saldoReal: 800 }] }), { status: 409 });
  assert.equal(db.saved().accounts[0].saldoActual, 1000);
});

test("rechaza cuentas duplicadas y saldos inválidos antes de guardar", async () => {
  const db = ajusteDb([{ id: 1, nombre: "BBVA", tipo: "debito", saldoActual: 1000 }]);
  for (const cuentas of [
    [{ cuentaId: 1, saldoReal: 800 }, { cuentaId: 1, saldoReal: 900 }],
    [{ cuentaId: 1, saldoReal: null }],
    [{ cuentaId: 1, saldoReal: Infinity }],
    [{ cuentaId: 2, saldoReal: 800 }],
  ]) {
    await assert.rejects(db.procesarAjuste("user", { fecha: "2026-09-17", cuentas }), { status: 400 });
  }
  assert.equal(db.saved().accounts[0].saldoActual, 1000);
});
