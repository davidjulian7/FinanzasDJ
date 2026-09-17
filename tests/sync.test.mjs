import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

function client(file, fetch) {
  const queue = new Map();
  const cleared = [];
  const events = [];
  const navigator = { onLine: true };
  const loadedClient = loadTs(file, {
    mocks: { "./db-client": {
      getAll: async () => [...queue.values()].map((entry) => ({ ...entry })),
      getById: async (_store, id) => queue.get(id),
      put: async (_store, value) => { queue.set(value.id, value); },
      remove: async (_store, id) => { queue.delete(id); },
      clearStore: async (store) => { await Promise.resolve(); cleared.push(store); },
    } },
    globals: {
      navigator, fetch,
      window: { dispatchEvent: (event) => events.push({ type: event.type, cleared: [...cleared] }) },
    },
  });
  return { ...loadedClient, queue, cleared, events, navigator };
}

test("un error 500 se muestra como error y nunca como ajuste completado o encolado", async () => {
  const c = client("src/lib/api.ts", async () => Response.json({ error: "Error interno" }, { status: 500 }));
  await assert.rejects(c.api.post("/api/ajuste", {}, { requireOnline: true }), { status: 500 });
  assert.equal(c.queue.size, 0);
  assert.equal(c.events.length, 0);
});

test("un ajuste sin conexión no devuelve una confirmación falsa ni se encola", async () => {
  const c = client("src/lib/api.ts", async () => assert.fail("No debe enviar solicitudes sin conexión"));
  c.navigator.onLine = false;
  await assert.rejects(c.api.post("/api/ajuste", {}, { requireOnline: true }), { status: 0 });
  assert.equal(c.queue.size, 0);
  await c.api.post("/api/transactions", { monto: 10 });
  assert.equal(c.queue.size, 1, "se conserva el soporte offline de los movimientos");
});

test("el ajuste confirmado invalida saldos y movimientos antes de refrescar el dashboard", async () => {
  const result = { transaccionesCreadas: 2, totalGastos: 100, totalIngresos: 20, diferenciaTotal: -80 };
  const c = client("src/lib/api.ts", async () => Response.json(result));
  assert.deepEqual(await c.api.post("/api/ajuste", {}, { requireOnline: true }), result);
  assert.equal(c.events.length, 1);
  assert.equal(c.events[0].type, "finanzas:data-changed");
  assert.deepEqual(new Set(c.events[0].cleared), new Set(["dashboard", "accounts", "transactions", "descriptions", "expense_categories"]));
});

test("la cola conserva fallos temporales, vuelve a intentar y avisa al dashboard al terminar", async () => {
  let status = 503;
  const c = client("src/lib/sync-queue.ts", async () => new Response(null, { status }));
  const id = await c.enqueue({ method: "POST", url: "/api/ajuste", body: { cuentas: [] } });
  await c.updateRetry(id, 10);
  assert.deepEqual(await c.processQueue(), { synced: 0, failed: 0, errors: [] });
  assert.equal(c.queue.size, 1, "no pierde el ajuste al alcanzar diez reintentos");
  assert.equal(c.events.length, 0);
  status = 200;
  assert.deepEqual(await c.processQueue(), { synced: 1, failed: 0, errors: [] });
  assert.equal(c.queue.size, 0);
  assert.equal(c.events[0].type, "finanzas:data-changed");
  assert.ok(c.events[0].cleared.includes("accounts"));
});

test("las sesiones vencidas y los límites de solicitudes conservan los cambios", async () => {
  for (const status of [401, 429]) {
    const c = client("src/lib/sync-queue.ts", async () => new Response(null, { status }));
    await c.enqueue({ method: "POST", url: "/api/ajuste" });
    await c.processQueue();
    assert.equal(c.queue.size, 1);
    assert.equal(c.events.length, 0);
  }
});

test("un ajuste ya realizado informa del conflicto y recupera los saldos del dashboard", async () => {
  const c = client("src/lib/sync-queue.ts", async () => Response.json({ error: "Ya se realizó un ajuste" }, { status: 409 }));
  await c.enqueue({ method: "POST", url: "/api/ajuste" });
  assert.deepEqual(await c.processQueue(), { synced: 0, failed: 1, errors: ["Ya se realizó un ajuste"] });
  assert.equal(c.queue.size, 0);
  assert.equal(c.events.length, 1);
  assert.ok(c.events[0].cleared.includes("dashboard"));
});

test("un fallo temporal detiene la cola para mantener el orden de los cambios", async () => {
  let calls = 0;
  const c = client("src/lib/sync-queue.ts", async () => { calls++; return new Response(null, { status: 500 }); });
  await c.enqueue({ method: "POST", url: "/api/ajuste" });
  await c.enqueue({ method: "POST", url: "/api/transactions" });
  await c.processQueue();
  assert.equal(calls, 1);
  assert.equal(c.queue.size, 2);
});
