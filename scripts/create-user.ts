import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { todayISO } from "../src/lib/format";

// Crea un usuario con acceso a la aplicación. Solo vos podés crear usuarios
// (no hay registro público). Uso:
//   npm run user:create -- <email> <password> [nombre]

const email = process.argv[2]?.toLowerCase() ?? "";
const password = process.argv[3] ?? "";
const nombre = process.argv[4]?.trim() ?? email.split("@")[0] ?? "Usuario";

if (!email || !password) {
  console.log("Uso: npm run user:create -- <correo> <contraseña> [nombre]");
  process.exit(1);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Correo inválido.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
if (existing) {
  console.error(`Ya existe un usuario con el correo "${email}".`);
  process.exit(1);
}

const row = db
  .insert(users)
  .values({ nombre, email, passwordHash: bcrypt.hashSync(password, 10), createdAt: todayISO() })
  .returning({ id: users.id, email: users.email, nombre: users.nombre })
  .all()[0];

console.log(`Usuario creado: ${row.email} (${row.nombre}) — id ${row.id}`);
console.log("Ya puede iniciar sesión en /login.");