import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apartados, apartadoContribuciones, transactions } from "@/lib/db/schema";
import { apiError, handleError } from "@/lib/api-server";

export const dynamic = "force-dynamic";

const EDITABLES = [
  "nombre",
  "montoObjetivo",
  "montoQuincena",
  "periodicidad",
  "diaPago",
  "mesPago",
  "budgetGroupId",
  "categoriaId",
  "cuentaId",
  "icono",
  "color",
  "nota",
  "activo",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const apartadoId = Number(id);
    const actual = db.select().from(apartados).where(eq(apartados.id, apartadoId)).get();
    if (!actual) return apiError("Apartado no encontrado", 404);

    const body = await req.json();
    const set: Record<string, unknown> = {};
    for (const key of EDITABLES) {
      if (key in body) {
        const v = body[key];
        if (key === "montoObjetivo") {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) return apiError("El monto objetivo debe ser mayor a cero");
          set[key] = Math.round(n * 100) / 100;
        } else if (key === "montoQuincena") {
          if (v == null || v === "") set[key] = null;
          else {
            const n = Number(v);
            if (!Number.isFinite(n) || n <= 0) return apiError("La cuota de quincena debe ser mayor a cero");
            set[key] = Math.round(n * 100) / 100;
          }
        } else if (key === "periodicidad") {
          if (v !== "mensual" && v !== "anual") return apiError("Periodicidad inválida");
          set[key] = v;
          if (v === "mensual") set.mesPago = null;
        } else if (key === "diaPago") {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 1 || n > 31) return apiError("El día de pago debe ser un número entre 1 y 31");
          set[key] = n;
        } else if (key === "mesPago") {
          if (v == null || v === "") set[key] = null;
          else {
            const n = Number(v);
            if (!Number.isInteger(n) || n < 1 || n > 12) return apiError("El mes de pago debe ser un número entre 1 y 12");
            set[key] = n;
          }
        } else if (key === "activo") {
          set[key] = Boolean(v);
        } else if (key === "budgetGroupId" || key === "categoriaId" || key === "cuentaId") {
          set[key] = v == null || v === "" ? null : Number(v);
        } else if (key === "nombre") {
          if (!String(v).trim()) return apiError("El nombre es obligatorio");
          set[key] = String(v).trim();
        } else if (key === "nota") {
          set[key] = v?.trim() || null;
        } else {
          set[key] = v;
        }
      }
    }
    if (Object.keys(set).length === 0) return apiError("No hay campos para actualizar");

    db.update(apartados).set(set).where(eq(apartados.id, apartadoId)).run();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const apartadoId = Number(id);
    const actual = db.select().from(apartados).where(eq(apartados.id, apartadoId)).get();
    if (!actual) return apiError("Apartado no encontrado", 404);

    db.transaction((tx) => {
      tx.update(transactions).set({ apartadoId: null }).where(eq(transactions.apartadoId, apartadoId)).run();
      tx.delete(apartadoContribuciones).where(eq(apartadoContribuciones.apartadoId, apartadoId)).run();
      tx.delete(apartados).where(eq(apartados.id, apartadoId)).run();
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}