"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PiggyBank, Check } from "lucide-react";
import { formatCurrency, monthKey } from "@/lib/format";
import { api } from "@/lib/api";
import { BudgetBar } from "@/components/budget-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconByName } from "@/components/icon-registry";
import { cn } from "@/lib/utils";
import { ApartadoPagoModal } from "@/components/apartado-pago-modal";
import type { BudgetExecutionData, BudgetExecutionGroup, ApartadoRow } from "@/lib/types";

export default function BudgetExecutionPage() {
  const hoy = new Date();
  const [mes, setMes] = useState(() => monthKey(hoy));
  const [quincena, setQuincena] = useState<1 | 2>(() => (hoy.getDate() <= 15 ? 1 : 2));
  const [data, setData] = useState<BudgetExecutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apartandoId, setApartandoId] = useState<number | null>(null);
  const [paying, setPaying] = useState<ApartadoRow | null>(null);

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

  const [m, a] = mes.split("-").map(Number);

  async function apartar(g: BudgetExecutionGroup, apartadoId: number) {
    setApartandoId(apartadoId);
    try {
      const res = await api.post<{ monto: number }>("/api/apartados/contribuciones", {
        apartadoId,
        anio: a,
        mes: m,
        quincena,
      });
      toast.success(`Apartado ${formatCurrency(res.monto)}`);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo apartar");
    } finally {
      setApartandoId(null);
    }
  }

  async function quitar(g: BudgetExecutionGroup, apartadoId: number) {
    setApartandoId(apartadoId);
    try {
      await api.delete(`/api/apartados/contribuciones?apartadoId=${apartadoId}&anio=${a}&mes=${m}&quincena=${quincena}`);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo deshacer");
    } finally {
      setApartandoId(null);
    }
  }

  async function abrirPago(apartadoId: number) {
    try {
      const list = await api.get<ApartadoRow[]>("/api/apartados");
      const ap = list.find((x) => x.id === apartadoId);
      if (ap) setPaying(ap);
    } catch {
      toast.error("No se pudo abrir el pago");
    }
  }

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

      {data.apartadosListos.length > 0 && (
        <div className="glass glow-hover rounded-2xl border border-border p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-positive">
            <PiggyBank className="size-4" /> Listos para pagar
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.apartadosListos.map((ap) => (
              <button
                key={ap.id}
                onClick={() => abrirPago(ap.id)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-positive/40"
              >
                <span className="flex size-7 items-center justify-center rounded-md text-xs" style={{ backgroundColor: `${ap.color}18`, color: ap.color }}>
                  <IconByName name={ap.icono} className="size-4" />
                </span>
                <span className="text-sm font-medium">{ap.nombre}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatCurrency(ap.juntado)} <span className="text-muted-foreground/60">/ {formatCurrency(ap.objetivo)}</span>
                </span>
                <Badge className="bg-positive/15 text-positive" variant="outline">
                  Pagar
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

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
              {g.reservado > 0 && (
                <span>
                  {formatCurrency(g.reservado)} reservados en apartados
                </span>
              )}
              {g.recurrentTotal > 0 && (
                <span>{formatCurrency(g.recurrentTotal)} reservados en recurrentes</span>
              )}
            </div>

            {g.apartados.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Apartados de este grupo
                </p>
                {g.apartados.map((ap) => (
                  <div
                    key={ap.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <div
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs"
                      style={{ backgroundColor: `${ap.color}18`, color: ap.color }}
                    >
                      <IconByName name={ap.icono} className="size-4" />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm">{ap.nombre}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatCurrency(ap.cuota)}/quincena
                    </span>
                    {ap.registrado ? (
                      <Button variant="ghost" size="sm" className="gap-1 text-positive" disabled={apartandoId === ap.id} onClick={() => quitar(g, ap.id)} title="Deshacer">
                        <Check className="size-3.5" /> Apartado
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" disabled={apartandoId === ap.id} onClick={() => apartar(g, ap.id)}>
                        <PiggyBank className="size-3.5" /> Apartar {formatCurrency(ap.cuota)}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

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

      <ApartadoPagoModal
        open={paying != null}
        onOpenChange={(v) => {
          if (!v) setPaying(null);
        }}
        apartado={paying}
        onSaved={cargar}
      />
    </div>
  );
}