import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apartados } from "@/lib/db/schema";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { crearTransaccion } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const apartadoId = Number(id);
    const apartado = (
      await db
        .select()
        .from(apartados)
        .where(and(eq(apartados.id, apartadoId), eq(apartados.userId, user.id)))
        .execute()
    )[0];
    if (!apartado) return apiError("Apartado no encontrado", 404);

    const body = await req.json();
    const monto = Number(body.monto);
    if (!Number.isFinite(monto) || monto <= 0) return apiError("El monto debe ser mayor a cero");

    const result = await crearTransaccion(user.id, {
      descripcion: body.descripcion?.trim() || `Pago: ${apartado.nombre}`,
      monto,
      tipo: "gasto",
      accountId: Number(body.accountId),
      categoryId: body.categoriaId != null ? Number(body.categoriaId) : apartado.categoriaId,
      apartadoId: apartado.id,
      fecha: body.fecha || new Date().toISOString().slice(0, 10),
      notas: `Pagado desde apartado "${apartado.nombre}"${body.notas?.trim() ? ` · ${body.notas.trim()}` : ""}`,
    });

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}