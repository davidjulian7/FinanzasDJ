import { CreditCard, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { CreditCardNotification } from "@/lib/credit-card-notifications";

export function CreditCardNotificationToast({ notification }: { notification: CreditCardNotification }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CreditCard className="size-5 text-primary" />
        <span className="font-semibold">Día de corte: {notification.tarjetaNombre}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-background/50 p-2">
          <p className="text-xs text-muted-foreground">Deuda a pagar</p>
          <p className="font-mono font-semibold text-destructive">{formatCurrency(notification.deudaActual)}</p>
        </div>
        <div className="rounded-lg bg-background/50 p-2">
          <p className="text-xs text-muted-foreground">Saldo en débito</p>
          <p className="font-mono font-semibold text-positive">{formatCurrency(notification.saldoCuentaPago)}</p>
        </div>
      </div>

      {notification.distribucion.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Distribución sugerida:</p>
          <div className="space-y-1">
            {notification.distribucion.map((d) => (
              <div key={d.cuentaId} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{d.cuentaNombre}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-muted-foreground">{formatCurrency(d.saldo)}</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="font-mono font-semibold text-primary">{formatCurrency(d.montoSugerido)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
