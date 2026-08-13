"use client";

import { CalendarClock, CalendarDays, Pencil, Trash2 } from "lucide-react";
import type { AccountRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { IconByName } from "@/components/icon-registry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<string, string> = {
  debito: "Débito",
  credito: "Crédito",
  efectivo: "Efectivo",
  inversion: "Inversión",
};

export function AccountCard({
  cuenta,
  onEdit,
  onDelete,
}: {
  cuenta: AccountRow;
  onEdit?: (c: AccountRow) => void;
  onDelete?: (c: AccountRow) => void;
}) {
  const esCredito = cuenta.tipo === "credito";
  const saldoNeg = esCredito && cuenta.saldoActual < 0;
  const deuda = saldoNeg ? 0 : cuenta.saldoActual;
  const aFavor = saldoNeg ? -cuenta.saldoActual : 0;
  const disponible =
    esCredito && cuenta.limiteCredito != null ? (saldoNeg ? aFavor : cuenta.limiteCredito - cuenta.saldoActual) : aFavor || null;
  const pctUso = esCredito && cuenta.limiteCredito ? Math.min(100, (deuda / cuenta.limiteCredito) * 100) : 0;

  return (
    <div className="glass glow-hover group relative overflow-hidden rounded-2xl border border-border p-5">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${cuenta.color}, ${cuenta.color}55)` }} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${cuenta.color}22`, color: cuenta.color }}
          >
            <IconByName name={cuenta.icono} className="size-5" />
          </div>
          <div>
            <p className="font-semibold leading-tight">{cuenta.nombre}</p>
            <p className="text-xs text-muted-foreground">{TIPO_LABEL[cuenta.tipo] ?? cuenta.tipo}</p>
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            {onEdit && (
              <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(cuenta)}>
                <Pencil className="size-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => onDelete(cuenta)}>
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 space-y-1">
        <p className="text-xs text-muted-foreground">{esCredito ? "Deuda actual" : "Saldo"}</p>
        <p
          className={cn(
            "font-mono text-2xl font-bold tracking-tight",
            esCredito && deuda > 0 && "text-destructive"
          )}
        >
          {formatCurrency(deuda)}
        </p>
        {saldoNeg && (
          <p className="text-xs text-muted-foreground">
            Disponible: {formatCurrency(aFavor)} · carga el límite para ver tu deuda real (límite − disponible)
          </p>
        )}
      </div>

      {esCredito && cuenta.limiteCredito != null && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Límite {formatCurrency(cuenta.limiteCredito)}</span>
            <span className={cn("font-mono font-semibold", (disponible ?? 0) < 0 && "text-destructive")}>
              Disponible: {formatCurrency(disponible ?? 0)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pctUso}%`, background: pctUso > 80 ? "#EF4444" : cuenta.color }}
            />
          </div>
          <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
            {cuenta.fechaCorte && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" /> Corte: día {cuenta.fechaCorte}
              </span>
            )}
            {cuenta.fechaPago && (
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3.5" /> Pago: día {cuenta.fechaPago}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
