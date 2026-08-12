import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { crearCuenta, type AccountInput } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = db.select().from(accounts).orderBy(accounts.id).all();
  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AccountInput>;
    const row = crearCuenta({
      nombre: body.nombre ?? "",
      tipo: (body.tipo ?? "debito") as AccountInput["tipo"],
      saldoActual: Number(body.saldoActual) || 0,
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
