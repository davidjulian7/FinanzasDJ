import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { debts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { NewDebt } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const rows = await db.select().from(debts).where(eq(debts.userId, user.id)).orderBy(debts.tipo, debts.id).execute();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = (await req.json()) as Partial<NewDebt>;
    if (!body.nombre?.trim()) return apiError("El nombre es obligatorio");
    if (body.tipo !== "por_pagar" && body.tipo !== "por_cobrar") return apiError("Tipo de deuda inválido");
    if (!Number.isFinite(Number(body.montoOriginal)) || Number(body.montoOriginal) < 0) {
      return apiError("El monto original es inválido");
    }
    const row = (
      await db
        .insert(debts)
        .values({
          userId: user.id,
          nombre: body.nombre.trim(),
          tipo: body.tipo,
          personaOAcreedor: body.personaOAcreedor ?? "",
          montoOriginal: Number(body.montoOriginal) || 0,
          saldoPendiente: Number(body.saldoPendiente) || Number(body.montoOriginal) || 0,
          fechaInicio: body.fechaInicio ?? new Date().toISOString().slice(0, 10),
        })
        .returning({ id: debts.id })
        .execute()
    )[0];
    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
