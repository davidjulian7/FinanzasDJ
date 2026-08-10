import { NextResponse } from "next/server";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : "Error inesperado";
  return NextResponse.json({ error: message }, { status: 500 });
}
