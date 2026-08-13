import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { pagarCuotasConMonto } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = await req.json();
    const accountId = Number(body.accountId);
    const monto = Number(body.monto);
    if (!Number.isInteger(accountId)) return apiError("Cuenta inválida");
    if (!Number.isFinite(monto) || monto <= 0) return apiError("El monto debe ser mayor a cero");
    const cuenta = db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)))
      .get();
    if (!cuenta) return apiError("Cuenta no encontrada", 404);
    if (cuenta.tipo !== "credito") return apiError("Las compras a meses solo aplican a tarjetas de crédito");
    return NextResponse.json(pagarCuotasConMonto(user.id, accountId, monto));
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}