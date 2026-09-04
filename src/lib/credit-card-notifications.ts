import { eq } from "drizzle-orm";
import { db } from "./db";
import { accounts } from "./db/schema";

export interface CreditCardNotification {
  tarjetaId: number;
  tarjetaNombre: string;
  deudaActual: number;
  fechaCorte: number;
  cuentaPagoId: number | null;
  cuentaPagoNombre: string | null;
  saldoCuentaPago: number;
  distribucion: { cuentaId: number; cuentaNombre: string; saldo: number; montoSugerido: number }[];
}

export async function checkCreditCardCutoff(userId: string): Promise<CreditCardNotification[]> {
  const hoy = new Date();
  const diaActual = hoy.getDate();

  const cuentas = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .execute();

  const tarjetasCredito = cuentas.filter(
    (c) => c.tipo === "credito" && c.fechaCorte != null && c.fechaCorte === diaActual
  );

  if (tarjetasCredito.length === 0) return [];

  const cuentasDebito = cuentas.filter((c) => c.tipo === "debito" || c.tipo === "efectivo");
  const totalSaldoDebito = cuentasDebito.reduce((sum, c) => sum + c.saldoActual, 0);

  const notificaciones: CreditCardNotification[] = [];

  for (const tarjeta of tarjetasCredito) {
    const deudaActual = Math.max(0, tarjeta.saldoActual);

    if (deudaActual <= 0) continue;

    const distribucion: CreditCardNotification["distribucion"] = [];

    if (totalSaldoDebito > 0) {
      for (const cuenta of cuentasDebito) {
        const proporcion = cuenta.saldoActual / totalSaldoDebito;
        const montoSugerido = Math.round(deudaActual * proporcion * 100) / 100;
        distribucion.push({
          cuentaId: cuenta.id,
          cuentaNombre: cuenta.nombre,
          saldo: cuenta.saldoActual,
          montoSugerido,
        });
      }
    }

    notificaciones.push({
      tarjetaId: tarjeta.id,
      tarjetaNombre: tarjeta.nombre,
      deudaActual,
      fechaCorte: tarjeta.fechaCorte!,
      cuentaPagoId: null,
      cuentaPagoNombre: null,
      saldoCuentaPago: totalSaldoDebito,
      distribucion,
    });
  }

  return notificaciones;
}
