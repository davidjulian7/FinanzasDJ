import { NextResponse } from "next/server";
import { handleError, unauthorized } from "@/lib/api-server";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    return NextResponse.json({ user });
  } catch (e) {
    return handleError(e);
  }
}