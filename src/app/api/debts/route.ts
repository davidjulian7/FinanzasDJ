import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { db } from "@/lib/db";
import { debts } from "@/lib/db/schema";
import type { NewDebt } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = db.select().from(debts).orderBy(debts.tipo, debts.id).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<NewDebt>;
    if (!body.nombre?.trim()) return apiError("El nombre es obligatorio");
    if (body.tipo !== "por_pagar" && body.tipo !== "por_cobrar") return apiError("Tipo de deuda inválido");
    if (!Number.isFinite(Number(body.montoOriginal)) || Number(body.montoOriginal) < 0) {
      return apiError("El monto original es inválido");
    }
    const row = db
      .insert(debts)
      .values({
        nombre: body.nombre.trim(),
        tipo: body.tipo,
        personaOAcreedor: body.personaOAcreedor ?? "",
        montoOriginal: Number(body.montoOriginal) || 0,
        saldoPendiente: Number(body.saldoPendiente) || Number(body.montoOriginal) || 0,
        fechaInicio: body.fechaInicio ?? new Date().toISOString().slice(0, 10),
      })
      .returning({ id: debts.id })
      .all()[0];
    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
