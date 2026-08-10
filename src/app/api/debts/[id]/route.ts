import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { db } from "@/lib/db";
import { debts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const actual = db.select().from(debts).where(eq(debts.id, Number(id))).get();
    if (!actual) return apiError("Deuda no encontrada", 404);
    db.update(debts)
      .set({
        nombre: body.nombre ?? actual.nombre,
        personaOAcreedor: body.personaOAcreedor ?? actual.personaOAcreedor,
        montoOriginal: body.montoOriginal != null ? Number(body.montoOriginal) : actual.montoOriginal,
        saldoPendiente: body.saldoPendiente != null ? Number(body.saldoPendiente) : actual.saldoPendiente,
        tipo: body.tipo ?? actual.tipo,
      })
      .where(eq(debts.id, Number(id)))
      .run();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    db.delete(debts).where(eq(debts.id, Number(id))).run();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
