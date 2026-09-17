import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleError, unauthorized } from "@/lib/api-server";
import { procesarAjuste, getCuentasParaAjuste } from "@/lib/ajuste";
import type { AjusteInput } from "@/lib/ajuste";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const cuentas = await getCuentasParaAjuste(user.id);
    return NextResponse.json(cuentas);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = (await request.json()) as AjusteInput;
    if (!body.cuentas || !Array.isArray(body.cuentas) || body.cuentas.length === 0) {
      return NextResponse.json({ error: "Debes ingresar al menos un saldo" }, { status: 400 });
    }
    const result = await procesarAjuste(user.id, body);
    return NextResponse.json(result);
  } catch (e) {
    return handleError(e);
  }
}
