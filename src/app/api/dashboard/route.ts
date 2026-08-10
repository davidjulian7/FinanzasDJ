import { NextRequest, NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") ?? "1970-01-01";
  const to = req.nextUrl.searchParams.get("to") ?? "2099-12-31";
  const data = getDashboard({ from, to });
  return NextResponse.json(data);
}
