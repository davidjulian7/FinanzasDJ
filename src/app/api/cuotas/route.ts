import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { db } from "@/lib/db";
import { accounts, cuotas } from "@/lib/db/schema";
import { crearCuota, type CuotaInput } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("account");
  const where = accountId ? eq(cuotas.accountId, Number(accountId)) : undefined;
  const rows = where
    ? db.select().from(cuotas).where(where).orderBy(desc(cuotas.id)).all()
    : db.select().from(cuotas).orderBy(desc(cuotas.id)).all();
  const cuentas = db.select().from(accounts).all();
  const byId = new Map(cuentas.map((c) => [c.id, c]));
  return NextResponse.json(
    rows.map((c) => ({
      id: c.id,
      accountId: c.accountId,
      descripcion: c.descripcion,
      monto: c.monto,
      meses: c.meses,
      tasaAnual: c.tasaAnual,
      cuota: c.cuota,
      total: c.total,
      pagadas: c.pagadas,
      fecha: c.fecha,
      transactionId: c.transactionId,
      cuenta: byId.get(c.accountId)?.nombre ?? "—",
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<CuotaInput>;
    const res = crearCuota({
      accountId: Number(body.accountId),
      descripcion: body.descripcion ?? "",
      monto: Number(body.monto),
      meses: Number(body.meses),
      tasaAnual: Number(body.tasaAnual) || 0,
      fecha: body.fecha ?? "",
      categoryId: body.categoryId ? Number(body.categoryId) : null,
    });
    return NextResponse.json(res, { status: 201 });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}