import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { debts } from "@/lib/db/schema";
import { validarMonto } from "@/lib/services";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = await req.json();
    const actual = (
      await db
        .select()
        .from(debts)
        .where(and(eq(debts.id, Number(id)), eq(debts.userId, user.id)))
        .execute()
    )[0];
    if (!actual) return apiError("Deuda no encontrada", 404);

    const montoOriginal = body.montoOriginal != null ? validarMonto(body.montoOriginal, "El monto original debe ser mayor a cero") : actual.montoOriginal;
    let saldoPendiente = actual.saldoPendiente;
    if (body.saldoPendiente != null) {
      const s = Number(body.saldoPendiente);
      if (!Number.isFinite(s) || s < 0) return apiError("El saldo pendiente debe ser mayor o igual a cero");
      saldoPendiente = s;
    }

    await db
      .update(debts)
      .set({
        nombre: body.nombre ?? actual.nombre,
        personaOAcreedor: body.personaOAcreedor ?? actual.personaOAcreedor,
        montoOriginal,
        saldoPendiente,
        tipo: body.tipo ?? actual.tipo,
      })
      .where(and(eq(debts.id, Number(id)), eq(debts.userId, user.id)))
      .execute();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;
    await db.delete(debts).where(and(eq(debts.id, Number(id)), eq(debts.userId, user.id))).execute();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
