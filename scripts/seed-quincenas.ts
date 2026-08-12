import { and, eq, like } from "drizzle-orm";
import { db } from "../src/lib/db";
import { budgets, categories } from "../src/lib/db/schema";

const NUEVAS: Array<{ nombre: string; icono: string; color: string; grupo: "necesidades" | "deseos" | "ahorro" }> = [
  { nombre: "Departamento", icono: "Home", color: "#F59E0B", grupo: "necesidades" },
  { nombre: "Línea telefónica", icono: "Phone", color: "#8B5CF6", grupo: "necesidades" },
  { nombre: "Terapia", icono: "HeartPulse", color: "#EC4899", grupo: "necesidades" },
  { nombre: "Gym", icono: "Dumbbell", color: "#10B981", grupo: "necesidades" },
];

function idPorNombre(nombre: string): number | undefined {
  const exact = db.select({ id: categories.id }).from(categories).where(eq(categories.nombre, nombre)).all();
  if (exact.length > 0) return exact[0].id;
  const parcial = db.select({ id: categories.id }).from(categories).where(like(categories.nombre, `%${nombre}%`)).all();
  return parcial[0]?.id;
}

for (const n of NUEVAS) {
  const existe = db.select({ id: categories.id }).from(categories).where(eq(categories.nombre, n.nombre)).all();
  if (existe.length === 0) {
    const row = db
      .insert(categories)
      .values({ nombre: n.nombre, tipo: "gasto", icono: n.icono, color: n.color, grupoPresupuesto: n.grupo })
      .returning({ id: categories.id })
      .all()[0];
    console.log("categoría creada:", n.nombre, row.id);
  }
}

const MONTO_POR_NOMBRE: Record<string, number> = {
  Comida: 550,
  "Línea telefónica": 150,
  Departamento: 1500,
  Terapia: 1000,
  Transporte: 120,
  Gym: 300,
  Servicios: 77.6,
};

const ANIO = 2026;
const MES = 8;
for (const q of [1, 2] as const) {
  for (const [nombre, monto] of Object.entries(MONTO_POR_NOMBRE)) {
    const catId = idPorNombre(nombre);
    if (!catId) {
      console.log("!! categoría inexistente:", nombre);
      continue;
    }
    db.delete(budgets)
      .where(and(eq(budgets.mes, MES), eq(budgets.anio, ANIO), eq(budgets.quincena, q), eq(budgets.categoriaId, catId)))
      .run();
    db.insert(budgets)
      .values({ mes: MES, anio: ANIO, quincena: q, categoriaId: catId, montoPresupuestado: monto })
      .run();
  }
}
console.log("presupuestos de agosto 2026 (Q1 y Q2) cargados");
for (const b of db.select().from(budgets).all()) {
  console.log(`Q${b.quincena} anio=${b.anio} mes=${b.mes} cat=${b.categoriaId} monto=${b.montoPresupuestado}`);
}