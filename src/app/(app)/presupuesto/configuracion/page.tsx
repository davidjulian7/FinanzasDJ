"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { api } from "@/lib/api";
import { BudgetRuleEditor } from "@/components/budget-rule-editor";
import { BudgetSubcategoryManager } from "@/components/budget-subcategory-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface BudgetGroupData {
  id: number;
  key: "necesidades" | "deseos" | "ahorro";
  label: string;
  color: string;
  icono: string;
  orden: number;
  subcategories: Array<{
    id: number;
    nombre: string;
    icono: string;
    color: string;
    orden: number;
    activo: boolean;
    presupuesto: number;
    expenseCategories: Array<{ id: number; nombre: string }>;
    recurrents: Array<{ id: number; nombre: string; monto: number }>;
  }>;
  recurrentTotal: number;
}

export default function BudgetConfigPage() {
  const [mes, setMes] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  });
  const [quincena, setQuincena] = useState<1 | 2>(() => (new Date().getDate() <= 15 ? 1 : 2));
  const [ingresosQuincena, setIngresosQuincena] = useState("");
  const [rule, setRule] = useState({ necesidades: 50, deseos: 30, ahorro: 20 });
  const [groups, setGroups] = useState<BudgetGroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a] = mes.split("-").map(Number);
      const data = await api.get<{
        mes: number;
        anio: number;
        quincena: number;
        ingresosQuincena: number;
        regla: { necesidades: number; deseos: number; ahorro: number };
        groups: BudgetGroupData[];
      }>(`/api/budget/config?mes=${m}&anio=${a}&quincena=${quincena}`);
      
      setIngresosQuincena(data.ingresosQuincena > 0 ? String(data.ingresosQuincena) : "");
      setRule(data.regla);
      setGroups(data.groups);
    } catch {
      toast.error("No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  }, [mes, quincena]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleRuleChange = useCallback((newRule: { necesidades: number; deseos: number; ahorro: number }) => {
    setRule(newRule);
  }, []);

  const handleGroupsChange = useCallback((groupKey: "necesidades" | "deseos" | "ahorro", subcats: Array<{ id?: number; presupuesto?: number }>) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? {
              ...g,
              subcategories: g.subcategories.map((sc) => {
                const updated = subcats.find((s) => s.id === sc.id);
                return updated ? { ...sc, presupuesto: updated.presupuesto ?? sc.presupuesto } : sc;
              }),
            }
          : g
      )
    );
  }, []);

  const ingresos = Number(ingresosQuincena) || 0;
  const grupoMontos = {
    necesidades: Math.round((ingresos * rule.necesidades) / 100),
    deseos: Math.round((ingresos * rule.deseos) / 100),
    ahorro: Math.round((ingresos * rule.ahorro) / 100),
  };

  const sumaRule = rule.necesidades + rule.deseos + rule.ahorro;
  const isValidRule = sumaRule === 100;

  const guardar = async () => {
    if (!isValidRule) {
      toast.error("Los porcentajes deben sumar 100%");
      return;
    }
    setSaving(true);
    try {
      const [m, a] = mes.split("-").map(Number);
      const subcategories = groups.flatMap((g) =>
        g.subcategories
          .filter((s) => s.activo)
          .map((s) => ({
            budgetSubcategoryId: s.id,
            montoPresupuestado: s.presupuesto || 0,
          }))
      );
      await api.post("/api/budget/config", {
        mes: m,
        anio: a,
        quincena,
        ingresosQuincena: ingresos,
        regla: rule,
        subcategories,
      });
      toast.success("Presupuesto guardado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

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
        <Button className={cn("btn-gradient gap-1.5", saving ? "opacity-75" : "")} onClick={guardar} disabled={saving || !isValidRule}>
          <Save className="size-4" /> {saving ? "Guardando…" : "Guardar presupuesto"}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="h-64 rounded-2xl border border-border animate-pulse bg-muted/50" />
          <div className="h-96 rounded-2xl border border-border animate-pulse bg-muted/50" />
          <div className="h-96 rounded-2xl border border-border animate-pulse bg-muted/50" />
        </div>
      ) : (
        <>
          <div className="glass glow-hover rounded-2xl border border-border p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold">Regla del presupuesto</h2>
                <p className="text-xs text-muted-foreground">
                  Ingreso de la quincena y porcentajes a cada grupo
                  {sumaRule !== 100 && (
                    <span className={cn("font-medium ml-2", sumaRule > 100 ? "text-destructive" : "text-warning")}>
                      (suma {sumaRule}%)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Ingreso de la quincena</label>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={ingresosQuincena}
                    onChange={(e) => setIngresosQuincena(e.target.value)}
                    placeholder="0"
                    className={cn("h-9 w-32 font-mono text-right text-sm")}
                  />
                </div>
              </div>
            </div>

            <BudgetRuleEditor
              initialRule={rule}
              ingresosQuincena={ingresos}
              onChange={handleRuleChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {groups.map((g) => {
              const disponible = grupoMontos[g.key] - g.recurrentTotal;
              return (
                <div key={g.id} className="space-y-4">
                  <div className="glass glow-hover rounded-2xl border border-border p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${g.color}22`, color: g.color }}
                      >
                        <span className="font-bold">{g.label[0]}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{g.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {g.subcategories.length} subcategorías · {g.recurrentTotal > 0 && `${formatCurrency(g.recurrentTotal)} recurrentes`}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">% del ingreso ({rule[g.key]}%)</span>
                        <span className="font-mono font-semibold">{formatCurrency(grupoMontos[g.key])}</span>
                      </div>
                      {g.recurrentTotal > 0 && (
                        <div className="flex justify-between text-warning">
                          <span>Gastos recurrentes comprometidos</span>
                          <span className="font-mono">{formatCurrency(g.recurrentTotal)}</span>
                        </div>
                      )}
                      <div className={cn("flex justify-between border-t pt-2", disponible >= 0 ? "text-positive" : "text-destructive")}>
                        <span className="font-medium">Disponible para distribuir</span>
                        <span className="font-mono font-semibold">{formatCurrency(disponible)}</span>
                      </div>
                    </div>

                    <BudgetSubcategoryManager
                      groupId={g.id}
                      groupKey={g.key}
                      groupLabel={g.label}
                      groupColor={g.color}
                      initialSubcategories={g.subcategories}
                      onChange={(subcats) => handleGroupsChange(g.key, subcats)}
                      ingresosGrupo={grupoMontos[g.key]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}