import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = db.select().from(categories).orderBy(categories.tipo, categories.id).all();
  return NextResponse.json(rows);
}
