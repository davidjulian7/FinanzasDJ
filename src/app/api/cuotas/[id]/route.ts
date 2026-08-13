import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { eliminarCuota, pagarCuota } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = await req.json();
    const cuentaPagoId = body?.cuentaPagoId ? Number(body.cuentaPagoId) : null;
    if (!cuentaPagoId) throw new Error("Seleccioná la cuenta desde la que se paga la cuota");
    const res = await pagarCuota(user.id, Number(id), cuentaPagoId);
    return NextResponse.json(res);
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
    await eliminarCuota(user.id, Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}