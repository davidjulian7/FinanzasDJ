"use client";

import { Edit, Check, PiggyBank, Trash2, ToggleLeft, ToggleRight, CalendarClock, ArrowRight } from "lucide-react";
import { IconByName } from "@/components/icon-registry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApartadoRow } from "@/lib/types";

export function ApartadoCard({
  apartado,
  busy,
  onApartar,
  onPagar,
  onEdit,
  onToggle,
  onDelete,
}: {
  apartado: ApartadoRow;
  busy: boolean;
  onApartar: (a: ApartadoRow) => void;
  onPagar: (a: ApartadoRow) => void;
  onEdit: (a: ApartadoRow) => void;
  onToggle: (a: ApartadoRow) => void;
  onDelete: (a: ApartadoRow) => void;
}) {
  const { apartadoQuincena } = apartado;
  const registradoHoy = apartadoQuincena.registrado;
  const periodicidad = apartado.periodicidad === "mensual" ? "mensual" : "anual";
  const auto = apartado.montoQuincena == null;

  return (
    <div
      className={cn(
        "glass glow-hover rounded-2xl border border-border p-4 transition-opacity",
        !apartado.activo && "opacity-55"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${apartado.color}22`, color: apartado.color }}
        >
          <IconByName name={apartado.icono} className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{apartado.nombre}</p>
            {apartado.estado === "listo" && (
              <Badge className="gap-1 bg-positive/15 text-positive" variant="outline">
                <Check className="size-3" /> Listo para pagar
              </Badge>
            )}
            {apartado.estado === "atrasado" && (
              <Badge className="gap-1 bg-destructive/15 text-destructive" variant="outline">
                Atrasado
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {apartado.grupo ? (
              <span className="font-medium" style={{ color: apartado.grupo.color }}>
                {apartado.grupo.label}
              </span>
            ) : (
              "Sin grupo"
            )}
            {" · "}
            {periodicidad} · vence <span className="font-mono">{formatShortDate(apartado.vencimiento)}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(apartado)} title="Editar">
            <Edit className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onToggle(apartado)} title={apartado.activo ? "Desactivar" : "Activar"}>
            {apartado.activo ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => onDelete(apartado)} title="Eliminar">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Juntado</span>
          <span className="font-mono">
            <span className="font-semibold">{formatCurrency(apartado.juntado)}</span>
            <span className="text-muted-foreground"> / {formatCurrency(apartado.montoObjetivo)}</span>
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${apartado.progreso}%`, background: `linear-gradient(90deg, ${apartado.color}88, ${apartado.color})` }}
          />
        </div>
        {apartado.faltante > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Faltan {formatCurrency(apartado.faltante)} · cuota {formatCurrency(apartado.cuotaEfectiva)}/quincena
            {auto ? " (automática)" : ""}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          variant={registradoHoy ? "secondary" : "outline"}
          className="flex-1"
          disabled={busy || registradoHoy}
          onClick={() => onApartar(apartado)}
        >
          {registradoHoy ? (
            <>
              <Check className="size-3.5" /> Apartado esta quincena
            </>
          ) : (
            <>
              <PiggyBank className="size-3.5" /> Apartar {formatCurrency(apartado.cuotaEfectiva)}
            </>
          )}
        </Button>
        <Button
          size="sm"
          className="btn-gradient flex-1"
          disabled={busy || apartado.juntado <= 0}
          onClick={() => onPagar(apartado)}
        >
          Pagar <ArrowRight className="size-3.5" />
        </Button>
      </div>

      {apartado.ultimoPago && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarClock className="size-3" /> Último pago: {formatShortDate(apartado.ultimoPago)}
        </p>
      )}
    </div>
  );
}