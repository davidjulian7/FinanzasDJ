"use client";

import { PiggyBank, Wallet, Umbrella } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const GRUPO_META = {
  necesidades: { label: "Necesidades", color: "#3B82F6", icon: Umbrella },
  deseos: { label: "Deseos", color: "#F59E0B", icon: Wallet },
  ahorro: { label: "Ahorro", color: "#06D6A0", icon: PiggyBank },
} as const;

export function BudgetBar({
  grupo,
  presupuestado,
  gastado,
}: {
  grupo: keyof typeof GRUPO_META;
  presupuestado: number;
  gastado: number;
}) {
  const meta = GRUPO_META[grupo];
  const Icon = meta.icon;
  const pct = presupuestado > 0 ? Math.min(100, (gastado / presupuestado) * 100) : gastado > 0 ? 100 : 0;
  const restante = presupuestado - gastado;
  const sobre = restante < 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="size-4" style={{ color: meta.color }} />
          {meta.label}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {formatCurrency(gastado)} <span className="text-muted-foreground/60">/ {formatCurrency(presupuestado)}</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700", sobre ? "bg-destructive" : "bg-gradient-to-r")}
          style={{
            width: `${pct}%`,
            background: sobre ? undefined : `linear-gradient(90deg, ${meta.color}88, ${meta.color})`,
          }}
        />
      </div>
      <p className={cn("text-xs", sobre ? "text-destructive" : "text-muted-foreground")}>
        {sobre ? `Excedido por ${formatCurrency(-restante)}` : `Restan ${formatCurrency(restante)}`}
        {" · "}
        {Math.round(pct)}%
      </p>
    </div>
  );
}

export function GrupoBar({
  label,
  presupuestado,
  gastado,
  color,
}: {
  label: string;
  presupuestado: number;
  gastado: number;
  color: string;
}) {
  const pct = presupuestado > 0 ? Math.min(100, (gastado / presupuestado) * 100) : gastado > 0 ? 100 : 0;
  const restante = presupuestado - gastado;
  const sobre = restante < 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono">
          {formatCurrency(gastado)} / {formatCurrency(presupuestado)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: sobre ? "#EF4444" : color }}
        />
      </div>
    </div>
  );
}
