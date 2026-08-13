import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { actualizarTransaccion, eliminarTransaccion, type TxInput } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<TxInput>;
    actualizarTransaccion(Number(id), {
      descripcion: body.descripcion ?? "",
      monto: Number(body.monto),
      tipo: (body.tipo ?? "gasto") as TxInput["tipo"],
      accountId: Number(body.accountId),
      accountDestinoId: body.accountDestinoId ? Number(body.accountDestinoId) : null,
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      apartadoId: body.apartadoId ? Number(body.apartadoId) : null,
      fecha: body.fecha ?? "",
      notas: body.notas ?? null,
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
    eliminarTransaccion(Number(id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}
