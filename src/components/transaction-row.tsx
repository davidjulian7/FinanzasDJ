"use client";

import { ArrowDownLeft, ArrowRight, Pencil, Trash2 } from "lucide-react";
import type { TxRow } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { IconByName } from "@/components/icon-registry";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function TransactionRow({
  tx,
  onEdit,
  onDelete,
  showActions = false,
}: {
  tx: TxRow;
  onEdit?: (tx: TxRow) => void;
  onDelete?: (tx: TxRow) => void;
  showActions?: boolean;
}) {
  const esIngreso = tx.tipo === "ingreso";
  const esGasto = tx.tipo === "gasto";
  const esTransferencia = tx.tipo === "transferencia";

  return (
    <div className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/60">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tx.color ?? "#6B6B85"}22`, color: tx.color ?? "#6B6B85" }}
      >
        {esTransferencia ? (
          <ArrowRight className="size-4.5" />
        ) : esIngreso ? (
          <ArrowDownLeft className="size-4.5" />
        ) : (
          <IconByName name={tx.icono ?? "Tag"} className="size-4.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.descripcion}</p>
        <p className="truncate text-xs text-muted-foreground">
          {esTransferencia ? `${tx.cuenta} → ${tx.cuentaDestino}` : tx.cuenta}
          {tx.categoria ? ` · ${tx.categoria}` : ""}
          {" · "}
          {formatDate(tx.fecha)}
        </p>
      </div>
      {showActions && (onEdit || onDelete) && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(tx)}>
              <Pencil className="size-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => onDelete(tx)}>
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      )}
      <p
        className={cn(
          "shrink-0 font-mono text-sm font-semibold",
          esIngreso && "text-positive",
          esGasto && "text-destructive",
          esTransferencia && "text-info"
        )}
      >
        {esIngreso ? "+" : esGasto ? "−" : "↔ "}
        {formatCurrency(tx.monto)}
      </p>
    </div>
  );
}
