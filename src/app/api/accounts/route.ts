import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { crearCuenta, type AccountInput } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const rows = await db.select().from(accounts).where(eq(accounts.userId, user.id)).orderBy(accounts.id).execute();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = (await req.json()) as Partial<AccountInput>;
    const row = await crearCuenta(user.id, {
      nombre: body.nombre ?? "",
      tipo: (body.tipo ?? "debito") as AccountInput["tipo"],
      saldoActual: body.saldoActual == null ? 0 : Number(body.saldoActual),
      limiteCredito: body.limiteCredito ?? null,
      fechaCorte: body.fechaCorte ?? null,
      fechaPago: body.fechaPago ?? null,
      color: body.color ?? "#7C3AED",
      icono: body.icono ?? "Wallet",
    });
    return NextResponse.json({ id: row?.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}
