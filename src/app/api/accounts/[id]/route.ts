import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { actualizarCuenta, eliminarCuenta, type AccountInput } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const body = (await req.json()) as Partial<AccountInput>;
    await actualizarCuenta(user.id, Number(id), {
      nombre: body.nombre ?? "",
      tipo: (body.tipo ?? "debito") as AccountInput["tipo"],
      saldoActual: body.saldoActual == null ? 0 : Number(body.saldoActual),
      limiteCredito: body.limiteCredito ?? null,
      fechaCorte: body.fechaCorte ?? null,
      fechaPago: body.fechaPago ?? null,
      color: body.color ?? "#2D3748",
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
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;
    await eliminarCuenta(user.id, Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}
