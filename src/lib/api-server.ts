import { NextResponse } from "next/server";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function handleError(e: unknown) {
  if (e instanceof Error) {
    console.error(`[api] error interno:`, e.stack);
  } else {
    console.error(`[api] error interno:`, e);
  }
  return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
}
