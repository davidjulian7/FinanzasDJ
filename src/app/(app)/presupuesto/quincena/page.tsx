"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, monthKey } from "@/lib/format";
import { api } from "@/lib/api";
import { BudgetBar } from "@/components/budget-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BudgetExecutionData {
  mes: number;
  anio: number;
  quincena: number;
  ingresosQuincena: number;
  regla: { necesidades: number; deseos: number; ahorro: number };
  groups: Array<{
    group: { id: number; key: "necesidades" | "deseos" | "ahorro"; label: string; color: string; icono: string; orden: number };
    subcategories: Array<{
      id: number;
      nombre: string;
      icono: string;
      color: string;
      orden: number;
      activo: boolean;
      expenseCategories: Array<{ id: number; nombre: string }>;
      recurrents: Array<{ id: number; nombre: string; monto: number }>;
      presupuestado: number;
      gastado: number;
      progreso: number;
      disponible: number;
    }>;
    totalPresupuestado: number;
    totalGastado: number;
    progreso: number;
    recurrentTotal: number;
    disponible: number;
  }>;
}

export default function BudgetExecutionPage() {
  const hoy = new Date();
  const [mes, setMes] = useState(() => monthKey(hoy));
  const [quincena, setQuincena] = useState<1 | 2>(() => (hoy.getDate() <= 15 ? 1 : 2));
  const [data, setData] = useState<BudgetExecutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resumen");

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resumen">Resumen por grupo</TabsTrigger>
          <TabsTrigger value="detalle">Detalle subcategorías</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <div className="space-y-4">
            {data.groups.map((g) => (
              <BudgetBar
                key={g.group.id}
                grupo={g.group.key}
                presupuestado={g.totalPresupuestado}
                gastado={g.totalGastado}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detalle">
          <div className="space-y-5">
            {data.groups.map((g) => (
              <div key={g.group.id} className="glass glow-hover rounded-2xl border border-border p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${g.group.color}22`, color: g.group.color }}
                  >
                    <span className="font-bold">{g.group.label[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-medium">{g.group.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      Presupuestado: {formatCurrency(g.totalPresupuestado)} · Gastado: {formatCurrency(g.totalGastado)} · {g.disponible >= 0 ? "Disponible" : "Excedido"}: {formatCurrency(Math.abs(g.disponible))}
                    </p>
                  </div>
                </div>

                {g.subcategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin subcategorías configuradas</p>
                ) : (
                  <div className="space-y-3">
                    {g.subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className={cn(
                          "flex flex-col gap-2 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:gap-4",
                          sub.activo ? "border-border bg-card" : "border-dashed bg-muted/50"
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${sub.color}22`, color: sub.color }}
                          >
                            <span className="text-lg">{sub.icono[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{sub.nombre}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              {sub.expenseCategories.length > 0 && <span>{sub.expenseCategories.length} cat.</span>}
                              {sub.recurrents.length > 0 && <span>{sub.recurrents.length} recurrentes</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative h-2 w-full flex-1 overflow-hidden rounded-full bg-muted sm:w-40">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, sub.progreso)}%`,
                                background: sub.gastado > sub.presupuestado ? "#EF4444" : sub.color,
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2 text-sm shrink-0">
                            <span className="font-mono text-right w-24">{formatCurrency(sub.gastado)}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-mono font-semibold text-right w-24">{formatCurrency(sub.presupuestado)}</span>
                            <span className={cn("font-mono text-xs", sub.disponible >= 0 ? "text-positive" : "text-destructive")}>
                              {sub.disponible >= 0 ? "+" : ""}{formatCurrency(sub.disponible)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}