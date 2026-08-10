import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { actualizarCuenta, eliminarCuenta, type AccountInput } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<AccountInput>;
    actualizarCuenta(Number(id), {
      nombre: body.nombre ?? "",
      tipo: (body.tipo ?? "debito") as AccountInput["tipo"],
      saldoActual: Number(body.saldoActual) || 0,
      limiteCredito: body.limiteCredito ?? null,
      fechaCorte: body.fechaCorte ?? null,
      fechaPago: body.fechaPago ?? null,
      color: body.color ?? "#7C3AED",
      icono: body.icono ?? "Wallet",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    eliminarCuenta(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}
