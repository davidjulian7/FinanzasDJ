import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError, unauthorized } from "@/lib/api-server";
import { getAjusteStatus } from "@/lib/ajuste";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const status = await getAjusteStatus(user.id);
    return NextResponse.json(status);
  } catch (e) {
    return handleError(e);
  }
}
