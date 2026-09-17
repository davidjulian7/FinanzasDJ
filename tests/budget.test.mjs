import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { parseMonthKey } = loadTs("src/lib/format.ts");
const ranges = loadTs("src/lib/ranges.ts");
const regla = { necesidades: 60, deseos: 25, ahorro: 15 };
const setting = (key, value, userId = "user") => ({ key, value: JSON.stringify(value), userId });

function budgetDb(savedSettings, transactions = []) {
  const rows = {
    settings: [setting("regla_pct", regla), ...savedSettings],
    transactions,
    accounts: [],
    budgetGroups: ["necesidades", "deseos", "ahorro"].map((key, i) => ({ id: i + 1, key })),
    expenseCategories: [{ id: 1, nombre: "Comida", budgetGroupId: 1, userId: "user", activo: true }],
    recurringExpenses: [],
    apartados: [],
    apartadoContribuciones: [],
  };
  const schema = Object.fromEntries(Object.keys(rows).map((name) => [name, new Proxy({ name }, {
    get: (target, field) => field === "name" ? target.name : field,
  })]));
  let writes = 0;
  const db = {
    select() {
      let table;
      let predicate = () => true;
      let limit = Infinity;
      const query = {
        from(value) { table = value; return query; },
        where(value) { predicate = value; return query; },
        orderBy() { return query; },
        limit(value) { limit = value; return query; },
        async execute() { return rows[table.name].filter(predicate).slice(0, limit); },
      };
      return query;
    },
    insert(table) {
      let value;
      let conflict;
      const query = {
        values(data) { value = data; return query; },
        onConflictDoUpdate(data) { conflict = data; return query; },
        async execute() {
          writes++;
          const existing = rows[table.name].find((row) => conflict.target.every((key) => row[key] === value[key]));
          if (existing) Object.assign(existing, conflict.set);
          else rows[table.name].push(value);
        },
      };
      return query;
    },
    transaction: (callback) => callback(db),
  };
  const mocks = {
    "./db": { db }, "@/lib/db": { db },
    "./db/schema": schema, "@/lib/db/schema": schema,
    "drizzle-orm": {
      eq: (key, value) => (row) => row[key] === value,
      gte: (key, value) => (row) => row[key] >= value,
      lte: (key, value) => (row) => row[key] <= value,
      and: (...predicates) => (row) => predicates.every((p) => p(row)),
      or: (...predicates) => (row) => predicates.some((p) => p(row)),
      desc: (value) => value,
    },
  };
  const globals = { Date: class extends Date {
    constructor(...args) { super(...(args.length ? args : [2026, 8, 17, 12])); }
  } };
  const settings = loadTs("src/lib/settings.ts", { mocks, globals });
  const { getDashboard } = loadTs("src/lib/dashboard.ts", { mocks, globals });
  const routeMocks = {
    ...mocks,
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/auth": { requireUser: async () => ({ id: "user" }) },
    "@/lib/api-server": {
      apiError: (error, status = 400) => Response.json({ error }, { status }),
      handleError: (error) => { throw error; },
    },
    "@/lib/settings": settings,
    "@/lib/ranges": ranges,
    "@/lib/recurrentes": loadTs("src/lib/recurrentes.ts"),
    "@/lib/apartados": {},
  };
  return {
    rows, settings, writes: () => writes,
    dashboard: () => getDashboard("user", { from: "2026-09-01", to: "2026-09-30" }),
    config: loadTs("src/app/api/budget/config/route.ts", { mocks: routeMocks }),
    execution: loadTs("src/app/api/budget/quincena/route.ts", { mocks: routeMocks }),
  };
}

test("el selector de mes conserva el año y el mes en su posición", () => {
  for (let mes = 1; mes <= 12; mes++) {
    assert.deepEqual(parseMonthKey(`2026-${String(mes).padStart(2, "0")}`), { anio: 2026, mes });
  }
});

test("dashboard y presupuesto recuperan el ingreso guardado con año y mes invertidos", async () => {
  const db = budgetDb([
    setting("ingreso_quincena_9_2026_1", 1000),
    setting("ingreso_quincena_9_2026_2", 12000),
    setting("ingreso_quincena_2026_9_2", 99999, "otro-usuario"),
  ], [
    { userId: "user", tipo: "gasto", monto: 500, fecha: "2026-09-05", categoryId: 1 },
    { userId: "user", tipo: "gasto", monto: 125, fecha: "2026-09-17", categoryId: 1 },
    { userId: "user", tipo: "ingreso", monto: 25000, fecha: "2026-09-17" },
  ]);
  const dashboard = await db.dashboard();
  assert.equal(dashboard.ingresosMes, 12000);
  assert.deepEqual(dashboard.presupuesto, {
    necesidades: { presupuestado: 7200, gastado: 125, apartado: 0 },
    deseos: { presupuestado: 3000, gastado: 0, apartado: 0 },
    ahorro: { presupuestado: 1800, gastado: 0, apartado: 0 },
  });
  const query = { url: "http://localhost/api/budget/config?mes=9&anio=2026&quincena=2" };
  const config = await (await db.config.GET(query)).json();
  const execution = await (await db.execution.GET(query)).json();
  assert.equal(config.ingresosQuincena, 12000);
  for (const group of execution.groups) {
    assert.equal(group.presupuestado, dashboard.presupuesto[group.group.key].presupuestado);
    assert.equal(group.gastado, dashboard.presupuesto[group.group.key].gastado);
  }
  assert.equal(db.writes(), 0, "la recuperación no modifica datos guardados");
});

test("guardar nuevamente usa la clave correcta y el dashboard refleja los nuevos montos", async () => {
  const db = budgetDb([setting("ingreso_quincena_9_2026_2", 12000)]);
  const payload = { ...parseMonthKey("2026-09"), quincena: 2, ingresosQuincena: 8000, regla };
  const response = await db.config.POST({ json: async () => payload });
  assert.equal(response.status, 200);
  assert.equal(db.rows.settings.find((row) => row.key === "ingreso_quincena_2026_9_2").value, "8000");
  const dashboard = await db.dashboard();
  assert.equal(dashboard.presupuesto.necesidades.presupuestado, 4800);
  assert.equal(dashboard.presupuesto.deseos.presupuestado, 2000);
  assert.equal(dashboard.presupuesto.ahorro.presupuestado, 1200);
});

test("un ingreso explícito de cero prevalece sobre el valor antiguo y los ingresos registrados", async () => {
  const db = budgetDb([
    setting("ingreso_quincena_9_2026_2", 12000),
    setting("ingreso_quincena_2026_9_2", 0),
  ], [{ userId: "user", tipo: "ingreso", fecha: "2026-09-17", monto: 15000 }]);
  assert.equal(await db.settings.getIngresoQuincena("user", 2026, 9, 2), 0);
});

test("la sugerencia de la quincena anterior reconoce claves antiguas y el cambio de año", async () => {
  const db = budgetDb([
    setting("ingreso_quincena_11_2025_2", 6000),
    setting("ingreso_quincena_12_2025_2", 10000),
    setting("ingreso_quincena_2_2026_1", 20000),
  ]);
  assert.equal(await db.settings.getIngresoQuincena("user", 2026, 1, 1), 10000);
  db.rows.settings.push(setting("ingreso_quincena_2025_12_2", 8000));
  assert.equal(await db.settings.getUltimoIngresoQuincena("user", 2026, 1, 1), 8000);
  db.rows.settings.find((row) => row.key === "ingreso_quincena_2025_12_2").value = "0";
  assert.equal(await db.settings.getUltimoIngresoQuincena("user", 2026, 1, 1), 6000);
});

test("las APIs rechazan períodos invertidos o inválidos antes de guardar", async () => {
  const db = budgetDb([]);
  for (const periodo of [
    { anio: 9, mes: 2026, quincena: 2 },
    { anio: 2026, mes: 13, quincena: 1 },
    { anio: 2026, mes: 9, quincena: 3 },
  ]) {
    const payload = { ...periodo, ingresosQuincena: 8000, regla };
    assert.equal((await db.config.POST({ json: async () => payload })).status, 400);
    const query = { url: `http://localhost/api/budget/config?${new URLSearchParams(periodo)}` };
    assert.equal((await db.config.GET(query)).status, 400);
    assert.equal((await db.execution.GET(query)).status, 400);
  }
  assert.equal(db.writes(), 0);
});
