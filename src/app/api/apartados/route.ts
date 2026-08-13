import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apartados } from "@/lib/db/schema";
import { cargarApartados } from "@/lib/apartados";
import { apiError, handleError, unauthorized } from "@/lib/api-server";
import { requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    return NextResponse.json(await cargarApartados(user.id));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    const body = await req.json();
    const {
      nombre,
      montoObjetivo,
      periodicidad,
      diaPago,
      mesPago,
      budgetGroupId,
      categoriaId,
      cuentaId,
      montoQuincena,
      icono,
      color,
      nota,
    } = body;

    if (!nombre?.trim()) return apiError("El nombre es obligatorio");
    const objetivo = Number(montoObjetivo);
    if (!Number.isFinite(objetivo) || objetivo <= 0) return apiError("El monto objetivo debe ser mayor a cero");
    if (periodicidad !== "mensual" && periodicidad !== "anual") return apiError("Periodicidad inválida");
    const dia = Number(diaPago);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) return apiError("El día de pago debe ser un número entre 1 y 31");
    if (periodicidad === "anual") {
      const m = Number(mesPago);
      if (!Number.isInteger(m) || m < 1 || m > 12) return apiError("El mes de pago debe ser un número entre 1 y 12");
    }
    if (budgetGroupId != null && !Number.isInteger(Number(budgetGroupId))) return apiError("Grupo inválido");
    let fija = null as number | null;
    if (montoQuincena != null && montoQuincena !== "") {
      const n = Number(montoQuincena);
      if (!Number.isFinite(n) || n <= 0) return apiError("La cuota de quincena debe ser mayor a cero");
      fija = Math.round(n * 100) / 100;
    }

    const result = (
      await db
        .insert(apartados)
        .values({
          userId: user.id,
          nombre: nombre.trim(),
          montoObjetivo: Math.round(objetivo * 100) / 100,
          montoQuincena: fija,
          periodicidad,
          diaPago: dia,
          mesPago: periodicidad === "anual" ? Number(mesPago) : null,
          budgetGroupId: budgetGroupId != null ? Number(budgetGroupId) : null,
          categoriaId: categoriaId != null ? Number(categoriaId) : null,
          cuentaId: cuentaId != null ? Number(cuentaId) : null,
          fechaInicio: todayISO(),
          icono: icono || "Wallet",
          color: color || "#7C3AED",
          nota: nota?.trim() || null,
        })
        .returning({ id: apartados.id })
        .execute()
    )[0];

    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}