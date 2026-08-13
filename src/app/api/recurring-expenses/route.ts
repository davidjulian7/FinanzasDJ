import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recurringExpenses, expenseCategories, accounts, budgetGroups } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(req.url);
  const activoOnly = searchParams.get("activo") === "true";

  const conds = [eq(recurringExpenses.userId, user.id)];
  if (activoOnly) conds.push(eq(recurringExpenses.activo, true));

  const items = db
    .select()
    .from(recurringExpenses)
    .where(and(...conds))
    .orderBy(desc(recurringExpenses.activo), recurringExpenses.nombre)
    .all();

  const cats = db.select().from(expenseCategories).where(eq(expenseCategories.userId, user.id)).all();
  const catById = new Map(cats.map((c) => [c.id, c]));

  const accs = db.select().from(accounts).where(eq(accounts.userId, user.id)).all();
  const accById = new Map(accs.map((a) => [a.id, a]));

  const groups = db.select().from(budgetGroups).all();
  const groupById = new Map(groups.map((g) => [g.id, g]));

  const withRelations = items.map((r) => ({
    ...r,
    expenseCategory: catById.get(r.expenseCategoryId),
    account: accById.get(r.accountId),
    budgetGroup: groupById.get(r.budgetGroupId),
  }));

  return NextResponse.json(withRelations);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = await req.json();
    const { nombre, monto, frecuencia, proximoCobro, expenseCategoryId, accountId, budgetGroupId, nota } = body;

    if (!nombre || !monto || !frecuencia || !proximoCobro || !expenseCategoryId || !accountId || !budgetGroupId) {
      return apiError("Todos los campos son requeridos");
    }

    const result = db
      .insert(recurringExpenses)
      .values({
        userId: user.id,
        nombre,
        monto,
        frecuencia,
        proximoCobro,
        expenseCategoryId,
        accountId,
        budgetGroupId,
        nota: nota ?? null,
        activo: true,
      })
      .returning({ id: recurringExpenses.id })
      .all()[0];

    return NextResponse.json({ id: result.id });
  } catch (e) {
    return handleError(e);
  }
}