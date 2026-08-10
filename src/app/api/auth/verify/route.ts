import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pin = String(body.pin ?? "").trim();
  if (!/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ ok: false, error: "El PIN debe tener entre 4 y 6 dígitos" });
  }
  const row = db.select().from(settings).where(eq(settings.key, "pin")).get();
  const ok = row ? row.value === pin : pin === "1234";
  return NextResponse.json({ ok });
}
