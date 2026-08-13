import { NextRequest, NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard";
import { requireUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const from = req.nextUrl.searchParams.get("from") ?? "1970-01-01";
  const to = req.nextUrl.searchParams.get("to") ?? "2099-12-31";
  const data = await getDashboard(user.id, { from, to });
  return NextResponse.json(data);
}