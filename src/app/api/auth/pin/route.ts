import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pinActual = String(body.pinActual ?? "").trim();
  const pinNuevo = String(body.pinNuevo ?? "").trim();
  const row = db.select().from(settings).where(eq(settings.key, "pin")).get();
  if (row && row.value !== pinActual) {
    return NextResponse.json({ error: "El PIN actual es incorrecto" }, { status: 400 });
  }
  if (!/^\d{4,6}$/.test(pinNuevo)) {
    return NextResponse.json({ error: "El nuevo PIN debe tener entre 4 y 6 dígitos" }, { status: 400 });
  }
  db.insert(settings)
    .values({ key: "pin", value: pinNuevo })
    .onConflictDoUpdate({ target: settings.key, set: { value: pinNuevo } })
    .run();
  return NextResponse.json({ ok: true });
}
