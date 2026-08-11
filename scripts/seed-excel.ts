import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { db } from "../src/lib/db";
import { accounts, budgets, categories, debts, settings, transactions } from "../src/lib/db/schema";

const FORCE = process.argv.includes("--force");

const TIPO_CUENTA: Record<string, "debito" | "credito" | "efectivo"> = {
  "TDC BBVA": "credito",
  "TDC NU": "credito",
  "TDC MP": "credito",
  "TDC REVOLUT": "credito",
  MP: "debito",
  BBVA: "debito",
  NU: "debito",
  Revolut: "debito",
  "Dinero en efectivo": "efectivo",
};

const ICONO_CUENTA: Record<string, string> = {
  "TDC BBVA": "CreditCard",
  "TDC NU": "CreditCard",
  "TDC MP": "CreditCard",
  "TDC REVOLUT": "CreditCard",
  MP: "Wallet",
  BBVA: "Landmark",
  NU: "Wallet",
  Revolut: "Wallet",
  "Dinero en efectivo": "Banknote",
};

const COLORES = ["#7C3AED", "#3B82F6", "#06D6A0", "#EF4444", "#F59E0B", "#10B981", "#84CC16", "#EC4899", "#0EA5E9"];

const ICONO_CAT: Record<string, string> = {
  "🍜 Comida": "Utensils",
  "🚖 Transporte": "Car",
  "📱Servicios": "Home",
  "🧘Salud": "HeartPulse",
  "☕️ Ocio": "Clapperboard",
  "🎁 Regalos": "Gift",
  Otros: "ShoppingBag",
  "💵 Dinero extra": "Gift",
  "🏅 Plus": "TrendingUp",
  "💰 Salario": "Wallet",
  Otro: "Tag",
};

const GRUPO_CAT: Record<string, "necesidades" | "deseos" | undefined> = {
  "🍜 Comida": "necesidades",
  "🚖 Transporte": "necesidades",
  "📱Servicios": "necesidades",
  "🧘Salud": "necesidades",
  "☕️ Ocio": "deseos",
  "🎁 Regalos": "deseos",
  Otros: "deseos",
};

function findBackup(): string {
  const files = fs
    .readdirSync(process.cwd())
    .filter((f) => f.toLowerCase().endsWith(".xlsx"))
    .sort()
    .reverse();
  if (files.length === 0) {
    throw new Error("No se encontró ningún archivo .xlsx en la raíz del proyecto.");
  }
  return path.join(process.cwd(), files[0]);
}

function fechaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

interface FilaExcel {
  fecha: string;
  cuenta: string;
  categoria: string;
  subcategoria: string;
  nota: string;
  monto: number;
  tipo: "Exp." | "Income" | "Transfer-In" | "Transfer-Out";
}

export function seedFromExcel(ruta: string): { cuentaFile: string; cuentas: number; categorias: number; transacciones: number } {
  const wb = XLSX.readFile(ruta, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" }) as unknown[][];

  const filas: FilaExcel[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const [period, acc, cat, sub, note, mxn, type] = r as [
      Date | number,
      string,
      string,
      string,
      string,
      number,
      string
    ];
    if (!(period instanceof Date) || !acc || !type) continue;
    filas.push({
      fecha: fechaISO(period),
      cuenta: String(acc).trim(),
      categoria: String(cat ?? "").trim(),
      subcategoria: String(sub ?? "").trim(),
      nota: String(note ?? "").trim(),
      monto: redondear(Number(mxn) || 0),
      tipo: type as FilaExcel["tipo"],
    });
  }
  if (filas.length === 0) throw new Error("El archivo Excel no contiene filas de datos.");

  const nombresCuentas = [...new Set(filas.map((f) => f.cuenta))];
  const esCuenta = (nombre: string) => TIPO_CUENTA[nombre] !== undefined;

  const usoCategoria = new Map<string, Set<"gasto" | "ingreso">>();
  for (const f of filas) {
    if (!f.categoria || esCuenta(f.categoria) || TIPO_CUENTA[f.categoria]) continue;
    const set = usoCategoria.get(f.categoria) ?? new Set<"gasto" | "ingreso">();
    set.add(f.tipo === "Income" ? "ingreso" : "gasto");
    usoCategoria.set(f.categoria, set);
  }
  const categoriasExcel = [...usoCategoria.entries()].map(([nombre, tipos]) => ({
    nombre,
    tipo: (tipos.has("gasto") ? "gasto" : "ingreso") as "gasto" | "ingreso",
  }));

  const tieneDatos = db.select({ id: accounts.id }).from(accounts).all().length > 0;
  if (tieneDatos && !FORCE) {
    throw new Error("La base de datos ya tiene datos. Ejecutá con --force para reemplazarlos por los del Excel.");
  }
  if (tieneDatos) {
    db.delete(budgets).run();
    db.delete(debts).run();
    db.delete(transactions).run();
    db.delete(categories).run();
    db.delete(accounts).run();
    db.delete(settings).run();
  }

  const accountIds: Record<string, number> = {};
  const balances: Record<string, number> = {};
  nombresCuentas.forEach((nombre, idx) => {
    const tipo = TIPO_CUENTA[nombre];
    const row = db
      .insert(accounts)
      .values({
        nombre,
        tipo,
        saldoInicial: 0,
        saldoActual: 0,
        color: COLORES[idx % COLORES.length],
        icono: ICONO_CUENTA[nombre] ?? "Wallet",
      })
      .returning({ id: accounts.id })
      .all()[0];
    accountIds[nombre] = row.id;
    balances[nombre] = 0;
  });

  const catIds: Record<string, number> = {};
  categoriasExcel.forEach((c, idx) => {
    const row = db
      .insert(categories)
      .values({
        nombre: c.nombre,
        tipo: c.tipo,
        icono: ICONO_CAT[c.nombre] ?? "Tag",
        color: COLORES[(nombresCuentas.length + idx) % COLORES.length],
        grupoPresupuesto: GRUPO_CAT[c.nombre] ?? null,
      })
      .returning({ id: categories.id })
      .all()[0];
    catIds[c.nombre] = row.id;
  });

  const esCredito = (nombre: string) => TIPO_CUENTA[nombre] === "credito";
  const deltaOrigen = (nombre: string, tipo: FilaExcel["tipo"]): number => {
    if (tipo === "Income") return esCredito(nombre) ? -1 : 1;
    if (tipo === "Exp.") return esCredito(nombre) ? 1 : -1;
    return -1;
  };

  let insertadas = 0;
  for (const f of filas) {
    if (f.tipo === "Transfer-In") continue;

    const accountId = accountIds[f.cuenta];
    let accountDestinoId: number | null = null;
    let tipo: "gasto" | "ingreso" | "transferencia";
    let categoryId: number | null = null;
    let descripcion: string;

    if (f.tipo === "Transfer-Out") {
      tipo = "transferencia";
      accountDestinoId = accountIds[f.categoria];
      descripcion = f.nota || `Transferencia a ${f.categoria}`;
    } else {
      tipo = f.tipo === "Income" ? "ingreso" : "gasto";
      if (catIds[f.categoria] !== undefined) categoryId = catIds[f.categoria];
      descripcion = f.nota || f.subcategoria || f.categoria || "Movimiento";
    }

    if (accountId === undefined) throw new Error(`Cuenta desconocida: ${f.cuenta}`);
    if (tipo === "transferencia" && accountDestinoId === undefined) {
      throw new Error(`Cuenta destino desconocida: ${f.categoria}`);
    }

    balances[f.cuenta] += f.monto * deltaOrigen(f.cuenta, f.tipo);
    if (accountDestinoId != null) {
      balances[f.categoria] += f.monto * (esCredito(f.categoria) ? -1 : 1);
    }

    db.insert(transactions)
      .values({
        descripcion,
        monto: f.monto,
        tipo,
        accountId,
        accountDestinoId,
        categoryId,
        fecha: f.fecha,
        notas: f.subcategoria || null,
      })
      .run();
    insertadas++;
  }

  for (const [nombre, saldo] of Object.entries(balances)) {
    db.update(accounts)
      .set({ saldoActual: redondear(saldo) })
      .where(eq(accounts.nombre, nombre))
      .run();
  }

  db.insert(settings).values({ key: "pin", value: "1234" }).onConflictDoNothing().run();

  return { cuentaFile: ruta, cuentas: nombresCuentas.length, categorias: categoriasExcel.length, transacciones: insertadas };
}

if (require.main === module) {
  const ruta = findBackup();
  const res = seedFromExcel(ruta);
  console.log(`Seed desde Excel (${path.basename(res.cuentaFile)}):`);
  console.log(`  ${res.cuentas} cuentas, ${res.categorias} categorías, ${res.transacciones} transacciones.`);
  console.log("Los saldos se calcularon a partir de los movimientos del período (sin saldos iniciales en el backup).");
}