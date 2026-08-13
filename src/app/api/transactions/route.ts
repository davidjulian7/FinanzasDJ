import { and, desc, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { apiError, handleError } from "@/lib/api-server";
import { db } from "@/lib/db";
import { accounts, expenseCategories, transactions, budgetGroups } from "@/lib/db/schema";
import { crearTransaccion, type TxInput } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  const accountId = sp.get("account");
  const categoriaId = sp.get("categoria");
  const tipo = sp.get("tipo");

  const conds = [];
  if (from) conds.push(gte(transactions.fecha, from));
  if (to) conds.push(lte(transactions.fecha, to));
  if (accountId) conds.push(eq(transactions.accountId, Number(accountId)));
  if (categoriaId) conds.push(eq(transactions.categoryId, Number(categoriaId)));
  if (tipo === "gasto" || tipo === "ingreso" || tipo === "transferencia") {
    conds.push(eq(transactions.tipo, tipo));
  }

  const where = conds.length ? and(...conds) : undefined;
  const rows = where
    ? db.select().from(transactions).where(where).orderBy(desc(transactions.fecha), desc(transactions.id)).all()
    : db.select().from(transactions).orderBy(desc(transactions.fecha), desc(transactions.id)).all();

  const cuentas = db.select().from(accounts).all();
  const cuentaById = new Map(cuentas.map((c) => [c.id, c]));
  const cats = db.select().from(expenseCategories).all();
  const catById = new Map(cats.map((c) => [c.id, c]));
  const groups = db.select().from(budgetGroups).all();
  const groupById = new Map(groups.map((g) => [g.id, g]));

  return NextResponse.json(
    rows.map((t) => {
      const cat = t.categoryId ? catById.get(t.categoryId) : undefined;
      const group = cat?.budgetGroupId ? groupById.get(cat.budgetGroupId) : undefined;
      return {
        id: t.id,
        descripcion: t.descripcion,
        monto: t.monto,
        tipo: t.tipo,
        fecha: t.fecha,
        notas: t.notas,
        accountId: t.accountId,
        accountDestinoId: t.accountDestinoId,
        categoryId: t.categoryId,
        cuenta: cuentaById.get(t.accountId)?.nombre ?? "—",
        cuentaDestino: t.accountDestinoId ? (cuentaById.get(t.accountDestinoId)?.nombre ?? "—") : null,
        categoria: cat?.nombre ?? null,
        icono: cat?.icono ?? null,
        color: cat?.color ?? null,
        budgetGroupKey: group?.key ?? null,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<TxInput>;
    const id = crearTransaccion({
      descripcion: body.descripcion ?? "",
      monto: Number(body.monto),
      tipo: (body.tipo ?? "gasto") as TxInput["tipo"],
      accountId: Number(body.accountId),
      accountDestinoId: body.accountDestinoId ? Number(body.accountDestinoId) : null,
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      fecha: body.fecha ?? "",
      notas: body.notas ?? null,
    });
    return NextResponse.json({ id: id?.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Error) return apiError(e.message);
    return handleError(e);
  }
}
