"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PiggyBank, Save, Umbrella, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import type { BudgetData, BudgetItem } from "@/lib/types";
import { formatCurrency, monthKey } from "@/lib/format";
import { GrupoBar } from "@/components/budget-bar";
import { IconByName } from "@/components/icon-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const GRUPOS = [
  { id: "necesidades", label: "Necesidades", color: "#3B82F6", icon: Umbrella, pct: 50 },
  { id: "deseos", label: "Deseos", color: "#F59E0B", icon: Wallet, pct: 30 },
  { id: "ahorro", label: "Ahorro", color: "#06D6A0", icon: PiggyBank, pct: 20 },
] as const;

export default function BudgetsPage() {
  const [mes, setMes] = useState(() => monthKey(new Date()));
  const [data, setData] = useState<BudgetData | null>(null);
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [pct, setPct] = useState<Record<string, number>>({ necesidades: 50, deseos: 30, ahorro: 20 });
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const cargar = useCallback(async () => {
    setData(null);
    try {
      const [m, a] = mes.split("-").map(Number);
      const d = await api.get<BudgetData>(`/api/budgets?mes=${m}&anio=${a}`);
      setData(d);
      const mapa: Record<number, string> = {};
      for (const it of d.items) mapa[it.categoriaId] = String(it.presupuestado);
      setMontos(mapa);
      const grupos: Record<string, number> = { necesidades: 0, deseos: 0, ahorro: 0 };
      const ingresos = d.ingresosMes || 1;
      for (const it of d.items) {
        if (it.grupo) grupos[it.grupo] += it.presupuestado;
      }
      setPct({
        necesidades: Math.round((grupos.necesidades / ingresos) * 100),
        deseos: Math.round((grupos.deseos / ingresos) * 100),
        ahorro: Math.round((grupos.ahorro / ingresos) * 100),
      });
    } catch {
      toast.error("No se pudieron cargar los presupuestos");
    }
  }, [mes]);

  useEffect(() => {
    cargar();
  }, [cargar, refresh]);

  const totalPorGrupo = useMemo(() => {
    const t = { necesidades: 0, deseos: 0, ahorro: 0 };
    if (!data) return t;
    for (const it of data.items) {
      if (it.grupo) t[it.grupo] += Number(montos[it.categoriaId] ?? it.presupuestado) || 0;
    }
    return t;
  }, [data, montos]);

  function aplicarRegla() {
    if (!data) return;
    const ingresos = data.ingresosMes || 0;
    const nuevo: Record<number, string> = {};
    for (const g of GRUPOS) {
      const totalGrupo = (ingresos * pct[g.id]) / 100;
      const items = data.items.filter((i) => i.grupo === g.id);
      const pesos = items.map((i) => Number(montos[i.categoriaId]) || 0);
      const sumaPesos = pesos.reduce((s, p) => s + p, 0);
      items.forEach((it, idx) => {
        if (sumaPesos === 0) {
          nuevo[it.categoriaId] = String(Math.round(totalGrupo / Math.max(1, items.length)));
        } else {
          nuevo[it.categoriaId] = String(Math.round((totalGrupo * pesos[idx]) / sumaPesos));
        }
      });
    }
    setMontos((prev) => ({ ...prev, ...nuevo }));
    toast.success("Distribución 50/30/20 aplicada");
  }

  async function guardar() {
    if (!data) return;
    setSaving(true);
    try {
      const [m, a] = mes.split("-").map(Number);
      const items = data.items.map((it) => ({
        categoriaId: it.categoriaId,
        monto: Number(montos[it.categoriaId]) || 0,
      }));
      await api.post("/api/budgets", { mes: m, anio: a, items });
      toast.success("Presupuestos guardados");
      setRefresh((r) => r + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="month"
          value={mes}
          onChange={(e) => e.target.value && setMes(e.target.value)}
          className="w-44 rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none"
        />
        <Button className="btn-gradient gap-1.5" onClick={guardar} disabled={saving || !data}>
          <Save className="size-4" /> {saving ? "Guardando…" : "Guardar presupuestos"}
        </Button>
      </div>

      {!data ? (
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="glass glow-hover rounded-2xl border border-border p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Regla 50/30/20</h2>
                <p className="text-xs text-muted-foreground">
                  Distribuye los ingresos del mes ({formatCurrency(data.ingresosMes)}) en tres grupos
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={aplicarRegla}>
                Aplicar a categorías
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {GRUPOS.map((g) => (
                <div key={g.id} className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <g.icon className="size-4" style={{ color: g.color }} />
                    {g.label}
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[pct[g.id]]}
                    onValueChange={(v) => setPct((p) => ({ ...p, [g.id]: v[0] }))}
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-bold" style={{ color: g.color }}>
                      {pct[g.id]}%
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatCurrency(((data.ingresosMes || 0) * pct[g.id]) / 100)}
                    </span>
                  </div>
                  <div className="pt-1">
                    <GrupoBar
                      label="Gastado vs asignado"
                      presupuestado={totalPorGrupo[g.id]}
                      gastado={gastadoGrupo(data.items, g.id)}
                      color={g.color}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass glow-hover rounded-2xl border border-border p-5">
            <h2 className="mb-1 font-semibold">Presupuestos por categoría</h2>
            <p className="mb-4 text-xs text-muted-foreground">Asigná un monto mensual a cada categoría de gasto.</p>
            <div className="space-y-3">
              {data.items.map((it: BudgetItem) => (
                <div
                  key={it.categoriaId}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3.5 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${it.color}22`, color: it.color }}
                    >
                      <IconByName name={it.icono} className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{it.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Gastado {formatCurrency(it.gastado)}
                        {it.grupo && ` · ${GRUPOS.find((g) => g.id === it.grupo)?.label}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative h-2 w-full flex-1 overflow-hidden rounded-full bg-muted sm:w-40">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (it.gastado / (Number(montos[it.categoriaId]) || 1)) * 100)}%`,
                          background: it.gastado > (Number(montos[it.categoriaId]) || 0) ? "#EF4444" : it.color,
                        }}
                      />
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={montos[it.categoriaId] ?? ""}
                      onChange={(e) => setMontos((m) => ({ ...m, [it.categoriaId]: e.target.value }))}
                      className={cn("h-9 w-32 font-mono text-right text-sm")}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function gastadoGrupo(items: BudgetItem[], grupo: string): number {
  return items.filter((i) => i.grupo === grupo).reduce((s, i) => s + i.gastado, 0);
}
