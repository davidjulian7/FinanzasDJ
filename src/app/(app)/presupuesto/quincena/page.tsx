"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, monthKey } from "@/lib/format";
import { api } from "@/lib/api";
import { BudgetBar } from "@/components/budget-bar";
import { cn } from "@/lib/utils";
import type { BudgetExecutionData } from "@/lib/types";

export default function BudgetExecutionPage() {
  const hoy = new Date();
  const [mes, setMes] = useState(() => monthKey(hoy));
  const [quincena, setQuincena] = useState<1 | 2>(() => (hoy.getDate() <= 15 ? 1 : 2));
  const [data, setData] = useState<BudgetExecutionData | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a] = mes.split("-").map(Number);
      const d = await api.get<BudgetExecutionData>(`/api/budget/quincena?mes=${m}&anio=${a}&quincena=${quincena}`);
      setData(d);
    } catch {
      console.error("Error cargando ejecución");
    } finally {
      setLoading(false);
    }
  }, [mes, quincena]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setQuincena(hoy.getDate() <= 15 ? 1 : 2);
  }, [mes]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-64 rounded-2xl border border-border animate-pulse bg-muted/50" />
        <div className="h-96 rounded-2xl border border-border animate-pulse bg-muted/50" />
        <div className="h-96 rounded-2xl border border-border animate-pulse bg-muted/50" />
      </div>
    );
  }

  const reglaTitle = `${data.regla.necesidades}/${data.regla.deseos}/${data.regla.ahorro}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={mes}
            onChange={(e) => e.target.value && setMes(e.target.value)}
            className="w-44 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none"
          />
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
            {([1, 2] as const).map((q) => (
              <button
                key={q}
                onClick={() => setQuincena(q)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  quincena === q ? "btn-gradient text-white shadow" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {q === 1 ? "1ra quincena" : "2da quincena"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-mono text-positive">+{formatCurrency(data.ingresosQuincena)}</span>
          <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary font-mono font-medium">
            Regla: {reglaTitle}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {data.groups.map((g) => (
          <div key={g.group.id} className="glass glow-hover rounded-2xl border border-border p-5">
            <BudgetBar
              grupo={g.group.key}
              presupuestado={g.presupuestado}
              gastado={g.gastado}
            />

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Disponible:{" "}
                <span className={cn("font-mono font-semibold", g.disponible >= 0 ? "text-positive" : "text-destructive")}>
                  {g.disponible >= 0 ? "+" : ""}
                  {formatCurrency(g.disponible)}
                </span>
              </span>
              {g.recurrentTotal > 0 && (
                <span>{formatCurrency(g.recurrentTotal)} reservados en recurrentes</span>
              )}
            </div>

            <div className="mt-3 space-y-1.5">
              {g.categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Sin categorías asignadas en este grupo
                </p>
              ) : (
                g.categorias.map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-1.5">
                    <div
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs"
                      style={{ backgroundColor: `${c.color}18`, color: c.color }}
                    >
                      {c.icono[0]}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm">{c.nombre}</span>
                    <span className="font-mono text-sm">{formatCurrency(c.gastado)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}