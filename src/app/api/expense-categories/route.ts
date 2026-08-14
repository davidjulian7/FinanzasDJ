import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenseCategories, budgetGroups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { seedCategoriesForUser } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const [allCats, groups] = await Promise.all([
      db.select().from(expenseCategories).where(eq(expenseCategories.userId, user.id)).execute(),
      db.select().from(budgetGroups).execute(),
    ]);
    if (allCats.length === 0) {
      await seedCategoriesForUser(user.id);
      allCats.push(...(await db.select().from(expenseCategories).where(eq(expenseCategories.userId, user.id)).execute()));
    }
    const cats = allCats.filter((c) => c.activo);
    const groupById = new Map(groups.map((g) => [g.id, g]));

    const withGroup = cats.map((c) => ({
      ...c,
      budgetGroup: c.budgetGroupId ? groupById.get(c.budgetGroupId) ?? null : null,
    }));

    return NextResponse.json(withGroup);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = await req.json();
    const { nombre, icono, color, budgetGroupId } = body;

    if (!nombre) {
      return apiError("nombre es requerido");
    }

    const result = (
      await db
        .insert(expenseCategories)
        .values({
          userId: user.id,
          nombre,
          icono: icono ?? "Tag",
          color: color ?? "#7C3AED",
          budgetGroupId: budgetGroupId ?? null,
          tipo: body?.tipo === "ingreso" ? "ingreso" : "gasto",
          activo: true,
        })
        .returning({ id: expenseCategories.id })
        .execute()
    )[0];

    return NextResponse.json({ id: result.id });
  } catch (e) {
    return handleError(e);
  }
}
