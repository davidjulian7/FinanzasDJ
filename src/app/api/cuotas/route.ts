import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, cuotas } from "@/lib/db/schema";
import { crearCuota, type CuotaInput } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const accountId = req.nextUrl.searchParams.get("account");
  const conds = [eq(cuotas.userId, user.id)];
  if (accountId) conds.push(eq(cuotas.accountId, Number(accountId)));
  const rows = db.select().from(cuotas).where(and(...conds)).orderBy(desc(cuotas.id)).all();
  const cuentas = db.select().from(accounts).where(eq(accounts.userId, user.id)).all();
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
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = (await req.json()) as Partial<CuotaInput>;
    const res = crearCuota(user.id, {
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