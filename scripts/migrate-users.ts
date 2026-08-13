import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  accounts,
  apartadoContribuciones,
  apartados,
  cuotas,
  debts,
  expenseCategories,
  recurringExpenses,
  settings,
  transactions,
  users,
} from "../src/lib/db/schema";
import { todayISO } from "../src/lib/format";

// Uso:
//   npm run db:migrate:users                  → aplica migraciones; si hay datos huérfanos avisa
//   npm run db:migrate:users -- <email> <password> [nombre]
//     Aplica migraciones, crea el primer usuario (si no existe ninguno) y
//     asigna todos los datos existentes (de la época del PIN global) a ese usuario.

const email = process.argv[2]?.toLowerCase() ?? "";
const password = process.argv[3] ?? "";
const nombre = process.argv[4]?.trim() ?? "Administrador";

const TABLAS = [
  { name: "accounts", tabla: accounts },
  { name: "expense_categories", tabla: expenseCategories },
  { name: "recurring_expenses", tabla: recurringExpenses },
  { name: "transactions", tabla: transactions },
  { name: "apartados", tabla: apartados },
  { name: "apartado_contribuciones", tabla: apartadoContribuciones },
  { name: "debts", tabla: debts },
  { name: "cuotas", tabla: cuotas },
] as const;

function rowsFor(tabla: (typeof TABLAS)[number]["tabla"]): { id: number; userId: number | null }[] {
  return db.select().from(tabla).all() as unknown as { id: number; userId: number | null }[];
}

function countOrphanRows(): number {
  let total = 0;
  for (const t of TABLAS) {
    const orphans = rowsFor(t.tabla).filter((r) => r.userId == null).length;
    if (orphans > 0) console.log(`  ${t.name}: ${orphans} filas sin dueño`);
    total += orphans;
  }
  return total;
}

function ensureAdmin(): number | null {
  const existing = db.select({ id: users.id }).from(users).all();
  if (existing.length > 0) {
    console.log(`Ya existen ${existing.length} usuarios en el sistema.`);
    if (!email) return null;
    const match = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
    return match?.id ?? null;
  }
  if (!email || !password) {
    console.log("No hay usuarios creados. Para crear el primero usá:");
    console.log("  npm run db:migrate:users -- <correo> <contraseña> [nombre]");
    return null;
  }
  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }
  const row = db
    .insert(users)
    .values({ nombre, email, passwordHash: bcrypt.hashSync(password, 10), createdAt: todayISO() })
    .returning({ id: users.id })
    .all()[0];
  console.log(`Usuario creado: ${email} (${nombre})`);
  return row.id;
}

function assignRows(adminId: number) {
  for (const t of TABLAS) {
    for (const r of rowsFor(t.tabla)) {
      if (r.userId == null) {
        db.update(t.tabla).set({ userId: adminId }).where(eq(t.tabla.id, r.id)).run();
      }
    }
  }
  const settingsRows = db.select().from(settings).all();
  let assigned = 0;
  for (const s of settingsRows) {
    if (s.userId == null) {
      if (s.key === "pin") {
        db.delete(settings).where(eq(settings.key, s.key)).run();
        continue;
      }
      db.update(settings).set({ userId: adminId }).where(eq(settings.key, s.key)).run();
      assigned++;
    }
  }
  console.log(`  settings: ${assigned} claves asignadas (el PIN global fue eliminado)`);
}

console.log("Migración de usuarios:");
const orphan = countOrphanRows();
if (orphan > 0) console.log(`Filas existentes sin dueño: ${orphan}`);

const adminId = ensureAdmin();

if (adminId) {
  console.log(`Asignando datos existentes al usuario #${adminId}…`);
  assignRows(adminId);
  console.log("Datos asignados correctamente.");
}

if (orphan > 0 && !adminId) {
  console.log("\nIMPORTANTE: hay datos sin dueño. Creá un usuario para reclamarlos:");
  console.log("  npm run db:migrate:users -- <correo> <contraseña> [nombre]");
}

console.log("Listo. Recordá definir AUTH_SECRET (ver .env.example).");