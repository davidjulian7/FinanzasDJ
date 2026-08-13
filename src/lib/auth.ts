import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "finanzas_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET es requerido en producción. Definilo en el entorno (por ejemplo, .env.local).");
    }
    console.warn("[auth] AUTH_SECRET no definido: usando secreto de desarrollo. Configuralo antes de producción.");
  }
  return new TextEncoder().encode(secret ?? "dev-only-secret-finanzasdj");
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export interface SessionUser {
  id: number;
  nombre: string;
  email: string;
}

async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ nombre: user.nombre, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function createSessionCookie(user: SessionUser): Promise<void> {
  const token = await signToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const row = db.select().from(users).where(eq(users.id, id)).get();
    if (!row) return null;
    return { id: row.id, nombre: row.nombre, email: row.email };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser | null> {
  return getSessionUser();
}