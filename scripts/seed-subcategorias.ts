import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { budgets, categories } from "../src/lib/db/schema";

const hijos = [
  { nombre: "Apple", monto: 42, icono: "Tv", color: "#84CC16" },
  { nombre: "Crunchy", monto: 15.6, icono: "Clapperboard", color: "#84CC16" },
  { nombre: "IA", monto: 20, icono: "Laptop", color: "#84CC16" },
];

const padre = db.select().from(categories).where(eq(categories.id, 67)).all()[0];
if (!padre) throw new Error("No existe la categoría 67 (Servicios)");

const ids: Record<string, number> = {};
for (const h of hijos) {
  const existe = db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.nombre, h.nombre), eq(categories.parentId, 67)))
    .all()[0];
  if (existe) {
    ids[h.nombre] = existe.id;
  } else {
    const r = db
      .insert(categories)
      .values({
        nombre: h.nombre,
        tipo: "gasto",
        icono: h.icono,
        color: h.color,
        grupoPresupuesto: "necesidades",
        parentId: 67,
      })
      .returning({ id: categories.id })
      .all()[0];
    ids[h.nombre] = r.id;
  }
  console.log(`Categoría "${h.nombre}" id=${ids[h.nombre]}`);
}

const quincenas = [
  { mes: 8, anio: 2026, quincena: 1 },
  { mes: 8, anio: 2026, quincena: 2 },
];

for (const q of quincenas) {
  db.delete(budgets)
    .where(and(eq(budgets.mes, q.mes), eq(budgets.anio, q.anio), eq(budgets.quincena, q.quincena), eq(budgets.categoriaId, 67)))
    .run();
  for (const h of hijos) {
    db.insert(budgets)
      .values({ mes: q.mes, anio: q.anio, quincena: q.quincena, categoriaId: ids[h.nombre], montoPresupuestado: h.monto })
      .onConflictDoUpdate({
        target: [budgets.mes, budgets.anio, budgets.quincena, budgets.categoriaId],
        set: { montoPresupuestado: h.monto },
      })
      .run();
  }
}

const resumen = db
  .select({
    quincena: budgets.quincena,
    categoriaId: budgets.categoriaId,
    nombre: categories.nombre,
    monto: budgets.montoPresupuestado,
  })
  .from(budgets)
  .innerJoin(categories, eq(categories.id, budgets.categoriaId))
  .where(and(eq(budgets.mes, 8), eq(budgets.anio, 2026), eq(categories.parentId, 67)))
  .all();
console.table(resumen);