import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apartados } from "@/lib/db/schema";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { cuotaEfectiva, quitarContribucion, registrarContribucion } from "@/lib/apartados";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = await req.json();
    const apartadoId = Number(body.apartadoId);
    const anio = Number(body.anio);
    const mes = Number(body.mes);
    const quincena = Number(body.quincena);

    if (!Number.isInteger(apartadoId)) return apiError("Apartado inválido");
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return apiError("Año inválido");
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) return apiError("Mes inválido");
    if (quincena !== 1 && quincena !== 2) return apiError("Quincena inválida");

    const apartado = (
      await db
        .select()
        .from(apartados)
        .where(and(eq(apartados.id, apartadoId), eq(apartados.userId, user.id)))
        .execute()
    )[0];
    if (!apartado) return apiError("Apartado no encontrado", 404);
    if (!apartado.activo) return apiError("El apartado está inactivo");

    const monto = cuotaEfectiva(apartado);
    await registrarContribucion(user.id, apartadoId, anio, mes, quincena, monto);

    return NextResponse.json({ ok: true, monto, apartadoId });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const sp = req.nextUrl.searchParams;
    const apartadoId = Number(sp.get("apartadoId"));
    const anio = Number(sp.get("anio"));
    const mes = Number(sp.get("mes"));
    const quincena = Number(sp.get("quincena"));
    if (!Number.isInteger(apartadoId) || !Number.isInteger(anio) || !Number.isInteger(mes) || (quincena !== 1 && quincena !== 2)) {
      return apiError("Parámetros inválidos");
    }
    await quitarContribucion(user.id, apartadoId, anio, mes, quincena);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}