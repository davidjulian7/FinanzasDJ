import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, db: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, db: "error" }, { status: 503 });
  }
}