import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { accounts, budgetGroups, debts, expenseCategories, transactions } from "./schema";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY = 86400000;

const accountDefs = [
  { nombre: "Banco Principal", tipo: "debito" as const, saldoInicial: 350000, color: "#7C3AED", icono: "Landmark" },
  { nombre: "Banco Secundario", tipo: "debito" as const, saldoInicial: 120000, color: "#3B82F6", icono: "Landmark" },
  { nombre: "Mercado Pago", tipo: "debito" as const, saldoInicial: 45000, color: "#06D6A0", icono: "Wallet" },
  { nombre: "Visa", tipo: "credito" as const, saldoInicial: 0, limiteCredito: 800000, fechaCorte: 12, fechaPago: 5, color: "#EF4444", icono: "CreditCard" },
  { nombre: "Mastercard", tipo: "credito" as const, saldoInicial: 0, limiteCredito: 600000, fechaCorte: 22, fechaPago: 8, color: "#F59E0B", icono: "CreditCard" },
  { nombre: "Efectivo", tipo: "efectivo" as const, saldoInicial: 30000, color: "#84CC16", icono: "Banknote" },
  { nombre: "Inversiones", tipo: "inversion" as const, saldoInicial: 500000, color: "#10B981", icono: "TrendingUp" },
];

const categoryDefs: Array<{
  nombre: string;
  tipo: "gasto" | "ingreso";
  icono: string;
  color: string;
  grupo: "necesidades" | "deseos" | "ahorro" | null;
}> = [
  { nombre: "Comida y Supermercado", tipo: "gasto" as const, icono: "Utensils", color: "#F59E0B", grupo: "necesidades" },
  { nombre: "Transporte", tipo: "gasto" as const, icono: "Car", color: "#3B82F6", grupo: "necesidades" },
  { nombre: "Servicios y Alquiler", tipo: "gasto" as const, icono: "Home", color: "#8B5CF6", grupo: "necesidades" },
  { nombre: "Salud", tipo: "gasto" as const, icono: "HeartPulse", color: "#EF4444", grupo: "necesidades" },
  { nombre: "Salidas y Ocio", tipo: "gasto" as const, icono: "Clapperboard", color: "#EC4899", grupo: "deseos" },
  { nombre: "Shopping", tipo: "gasto" as const, icono: "ShoppingBag", color: "#14B8A6", grupo: "deseos" },
  { nombre: "Suscripciones", tipo: "gasto" as const, icono: "Tv", color: "#6366F1", grupo: "deseos" },
  { nombre: "Viajes", tipo: "gasto" as const, icono: "Plane", color: "#0EA5E9", grupo: "deseos" },
  { nombre: "Educación", tipo: "gasto" as const, icono: "GraduationCap", color: "#F97316", grupo: "deseos" },
  { nombre: "Ahorro e Inversión", tipo: "gasto" as const, icono: "PiggyBank", color: "#06D6A0", grupo: "ahorro" },
  { nombre: "Pago de deudas", tipo: "gasto" as const, icono: "HandCoins", color: "#A855F7", grupo: null },
  { nombre: "Sueldo", tipo: "ingreso" as const, icono: "Wallet", color: "#06D6A0", grupo: null },
  { nombre: "Freelance", tipo: "ingreso" as const, icono: "Laptop", color: "#10B981", grupo: null },
  { nombre: "Otros Ingresos", tipo: "ingreso" as const, icono: "Gift", color: "#84CC16", grupo: null },
  { nombre: "Cobro de deudas", tipo: "ingreso" as const, icono: "HandCoins", color: "#A855F7", grupo: null },
];

const debtDefs = [
  { nombre: "Préstamo personal", tipo: "por_pagar" as const, personaOAcreedor: "Banco Nación", montoOriginal: 500000, saldoPendiente: 320000, offsetInicio: 200 },
  { nombre: "Tarjeta de crédito", tipo: "por_pagar" as const, personaOAcreedor: "Visa", montoOriginal: 250000, saldoPendiente: 120000, offsetInicio: 60 },
  { nombre: "Préstamo a Julián", tipo: "por_cobrar" as const, personaOAcreedor: "Julián", montoOriginal: 80000, saldoPendiente: 35000, offsetInicio: 40 },
];

export async function seedCategoriesForUser(userId: string) {
  const existing = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(eq(expenseCategories.userId, userId))
    .execute();
  if (existing.length > 0) return;

  const grupos = await db.select().from(budgetGroups).execute();
  const groupByKey = new Map(grupos.map((g) => [g.key, g.id]));
  await db
    .insert(expenseCategories)
    .values(
      categoryDefs.map((c) => ({
        userId,
        nombre: c.nombre,
        tipo: c.tipo,
        icono: c.icono,
        color: c.color,
        budgetGroupId: c.grupo ? (groupByKey.get(c.grupo) ?? null) : null,
        activo: true,
      })),
    )
    .execute();
}

export async function seedBudgetGroups() {
  const existing = await db.select({ id: budgetGroups.id }).from(budgetGroups).execute();
  if (existing.length > 0) return;
  const defs: Array<{ key: "necesidades" | "deseos" | "ahorro"; label: string; color: string; icono: string; orden: number }> = [
    { key: "necesidades", label: "Necesidades", color: "#3B82F6", icono: "House", orden: 1 },
    { key: "deseos", label: "Deseos", color: "#EC4899", icono: "Sparkles", orden: 2 },
    { key: "ahorro", label: "Ahorro", color: "#06D6A0", icono: "PiggyBank", orden: 3 },
  ];
  await db.insert(budgetGroups).values(defs).execute();
}

export async function seedDatabase(userId?: string) {
  await seedBudgetGroups();
  const existing = await db.select({ id: accounts.id }).from(accounts).execute();
  if (existing.length > 0) return { seeded: false, transactions: 0 };

  const rng = mulberry32(20260214);

  const accountIds: Record<string, number> = {};
  const balances: Record<string, number> = {};
  const insertedAccounts = await db
    .insert(accounts)
    .values(accountDefs.map((a) => ({ ...a, userId: userId ?? null, saldoActual: a.saldoInicial })))
    .returning({ id: accounts.id, nombre: accounts.nombre, tipo: accounts.tipo })
    .execute();
  for (const a of insertedAccounts) {
    const def = accountDefs.find((d) => d.nombre === a.nombre)!;
    accountIds[a.nombre] = a.id;
    balances[a.nombre] = def.saldoInicial;
  }

  const catIds: Record<string, number> = {};
  const grupos = await db.select().from(budgetGroups).execute();
  const groupByKey = new Map(grupos.map((g) => [g.key, g.id]));
  for (const c of categoryDefs) {
    const rows = await db
      .insert(expenseCategories)
      .values({
        userId: userId ?? null,
        nombre: c.nombre,
        tipo: c.tipo,
        icono: c.icono,
        color: c.color,
        budgetGroupId: c.grupo ? (groupByKey.get(c.grupo) ?? null) : null,
        activo: true,
      })
      .returning({ id: expenseCategories.id, nombre: expenseCategories.nombre })
      .execute();
    catIds[c.nombre] = rows[0].id;
  }

  type TxSeed = {
    descripcion: string;
    monto: number;
    tipo: "gasto" | "ingreso" | "transferencia";
    account: string;
    destino?: string;
    categoria?: string;
    fecha: string;
  };
  const txList: TxSeed[] = [];

  function push(tx: TxSeed) {
    txList.push(tx);
    const esCredito = ["Visa", "Mastercard"].includes(tx.account);
    const delta =
      tx.tipo === "ingreso"
        ? esCredito
          ? -tx.monto
          : tx.monto
        : tx.tipo === "gasto"
          ? esCredito
            ? tx.monto
            : -tx.monto
          : -tx.monto;
    balances[tx.account] = balances[tx.account] + delta;
    if (tx.destino) {
      balances[tx.destino] = balances[tx.destino] + tx.monto * (["Visa", "Mastercard"].includes(tx.destino) ? -1 : 1);
    }
  }

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)];
  }

  function rand(min: number, max: number) {
    return Math.round(min + rng() * (max - min));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - 95 * DAY);

  const now = new Date(today.getTime());

  for (let t = new Date(start); t <= now; t = new Date(t.getTime() + DAY)) {
    const d = t.getDate();
    const fecha = fmt(t);
    const esPrimerMes = t.getTime() - start.getTime() < 33 * DAY;

    if (d === 1) {
      push({ descripcion: "Sueldo mensual", monto: 600000, tipo: "ingreso", account: "Banco Principal", categoria: "Sueldo", fecha });
      if (rng() < 0.5 && !esPrimerMes) {
        push({ descripcion: "Freelance: proyecto web", monto: rand(60000, 120000), tipo: "ingreso", account: "Banco Secundario", categoria: "Freelance", fecha });
      }
      if (t > start) {
        push({ descripcion: "Suscripciones del mes", monto: rand(26000, 38000), tipo: "gasto", account: "Mercado Pago", categoria: "Suscripciones", fecha });
      }
    }
    if (d === 2 && !esPrimerMes) {
      push({ descripcion: "Alquiler mensual", monto: 130000, tipo: "gasto", account: "Banco Principal", categoria: "Servicios y Alquiler", fecha });
    }
    if (d === 3) {
      push({ descripcion: "Luz y gas", monto: rand(16000, 24000), tipo: "gasto", account: "Banco Principal", categoria: "Servicios y Alquiler", fecha });
    }
    if (d === 6) {
      push({ descripcion: "Pago tarjeta Visa", monto: 70000, tipo: "transferencia", account: "Banco Principal", destino: "Visa", fecha });
    }
    if (d === 8) {
      push({ descripcion: "Pago tarjeta Mastercard", monto: 40000, tipo: "transferencia", account: "Banco Principal", destino: "Mastercard", fecha });
    }
    if (d === 10) {
      push({ descripcion: "Retiro efectivo", monto: 40000, tipo: "transferencia", account: "Banco Principal", destino: "Efectivo", fecha });
    }
    if (d === 12) {
      push({ descripcion: "Recarga Mercado Pago", monto: 140000, tipo: "transferencia", account: "Banco Principal", destino: "Mercado Pago", fecha });
    }
    if (d === 15) {
      push({ descripcion: "Transferencia a inversiones", monto: 60000, tipo: "transferencia", account: "Banco Principal", destino: "Inversiones", fecha });
    }
    if (d === 20) {
      push({ descripcion: "Internet y celular", monto: rand(18000, 24000), tipo: "gasto", account: "Banco Principal", categoria: "Servicios y Alquiler", fecha });
    }
    if (d === 25 && rng() < 0.75 && !esPrimerMes) {
      push({ descripcion: "Freelance: consultoría", monto: rand(40000, 90000), tipo: "ingreso", account: "Banco Secundario", categoria: "Freelance", fecha });
    }
    if (d === 27) {
      push({ descripcion: "Rendimiento inversiones", monto: rand(8000, 18000), tipo: "ingreso", account: "Inversiones", categoria: "Otros Ingresos", fecha });
    }

    if (rng() < 0.4) {
      const acct = pick(["Banco Principal", "Banco Principal", "Mercado Pago", "Efectivo"]);
      const monto = d % 7 === 0 ? rand(12000, 20000) : rand(6000, 16000);
      push({ descripcion: pick(["Supermercado", "Feria de alimentos", "Delivery comida", "Despensa"]), monto, tipo: "gasto", account: acct, categoria: "Comida y Supermercado", fecha });
    }
    if (rng() < 0.25) {
      const acct = pick(["Mercado Pago", "Mercado Pago", "Banco Principal"]);
      push({ descripcion: pick(["Viaje en Uber", "Sube / transporte", "Combustible", "Taxi"]), monto: rand(3000, 9000), tipo: "gasto", account: acct, categoria: "Transporte", fecha });
    }
    if (rng() < 0.15) {
      const acct = pick(["Visa", "Visa", "Mercado Pago", "Mercado Pago", "Efectivo"]);
      push({ descripcion: pick(["Cine y salida", "Restaurante", "Bar con amigos", "Show / evento"]), monto: rand(9000, 30000), tipo: "gasto", account: acct, categoria: "Salidas y Ocio", fecha });
    }
    if (rng() < 0.05) {
      const acct = pick(["Visa", "Visa", "Mastercard", "Banco Principal"]);
      push({ descripcion: pick(["Compra ropa", "Zapatillas", "Electrónica", "Librería"]), monto: rand(20000, 60000), tipo: "gasto", account: acct, categoria: "Shopping", fecha });
    }
    if (rng() < 0.03) {
      const acct = pick(["Banco Principal", "Visa"]);
      push({ descripcion: pick(["Farmacia", "Consulta médica", "Dentista"]), monto: rand(8000, 22000), tipo: "gasto", account: acct, categoria: "Salud", fecha });
    }
    if (rng() < 0.03) {
      push({ descripcion: pick(["Curso online", "Libros", "Taller"]), monto: rand(10000, 40000), tipo: "gasto", account: "Banco Principal", categoria: "Educación", fecha });
    }
    if (rng() < 0.01) {
      const acct = pick(["Mastercard", "Visa"]);
      push({ descripcion: pick(["Excursión de fin de semana", "Pasaje aéreo", "Escape"]), monto: rand(50000, 140000), tipo: "gasto", account: acct, categoria: "Viajes", fecha });
    }
    if (rng() < 0.1) {
      push({ descripcion: "Inversión manual", monto: rand(5000, 15000), tipo: "transferencia", account: "Banco Principal", destino: "Inversiones", fecha });
    }
  }

  for (const tx of txList) {
    await db
      .insert(transactions)
      .values({
        userId: userId ?? null,
        descripcion: tx.descripcion,
        monto: tx.monto,
        tipo: tx.tipo,
        accountId: accountIds[tx.account],
        accountDestinoId: tx.destino ? accountIds[tx.destino] : null,
        categoryId: tx.categoria ? catIds[tx.categoria] : null,
        fecha: tx.fecha,
      })
      .execute();
  }

  for (const [name, saldo] of Object.entries(balances)) {
    await db.update(accounts).set({ saldoActual: Math.round(saldo) }).where(and(eq(accounts.nombre, name))).execute();
  }

  for (const de of debtDefs) {
    const fechaInicio = new Date(today.getTime() - de.offsetInicio * DAY);
    await db
      .insert(debts)
      .values({
        userId: userId ?? null,
        nombre: de.nombre,
        tipo: de.tipo,
        personaOAcreedor: de.personaOAcreedor,
        montoOriginal: de.montoOriginal,
        saldoPendiente: de.saldoPendiente,
        fechaInicio: fmt(fechaInicio),
      })
      .execute();
  }

  return { seeded: true, transactions: txList.length };
}