import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError, unauthorized } from "@/lib/api-server";
import { checkCreditCardCutoff } from "@/lib/credit-card-notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const notificaciones = await checkCreditCardCutoff(user.id);
    return NextResponse.json(notificaciones);
  } catch (e) {
    return handleError(e);
  }
}
