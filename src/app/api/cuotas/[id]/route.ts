import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { eliminarCuota, pagarCuota } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const cuentaPagoId = body?.cuentaPagoId ? Number(body.cuentaPagoId) : null;
    if (!cuentaPagoId) throw new Error("Seleccioná la cuenta desde la que se paga la cuota");
    const res = pagarCuota(Number(id), cuentaPagoId);
    return NextResponse.json(res);
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    eliminarCuota(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}