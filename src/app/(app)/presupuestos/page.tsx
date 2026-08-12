"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, PiggyBank, Save, Umbrella, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import type { BudgetData, BudgetItem } from "@/lib/types";
import { formatCurrency, monthKey } from "@/lib/format";
import { GrupoBar } from "@/components/budget-bar";
import { IconByName } from "@/components/icon-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const GRUPOS = [
  { id: "necesidades", label: "Necesidades", color: "#3B82F6", icon: Umbrella },
  { id: "deseos", label: "Deseos", color: "#F59E0B", icon: Wallet },
  { id: "ahorro", label: "Ahorro", color: "#06D6A0", icon: PiggyBank },
] as const;

type Grupo = (typeof GRUPOS)[number]["id"];

function quincenaActual(): 1 | 2 {
  return new Date().getDate() <= 15 ? 1 : 2;
}

export default function BudgetsPage() {
  const hoy = new Date();
  const [mes, setMes] = useState(() => monthKey(hoy));
  const [quincena, setQuincena] = useState<1 | 2>(quincenaActual());
  const [data, setData] = useState<BudgetData | null>(null);
  const [montos, setMontos] = useState<Record<number, string>>({});
  const [ingresos, setIngresos] = useState("");
  const [pct, setPct] = useState<Record<Grupo, number>>({ necesidades: 50, deseos: 30, ahorro: 20 });
  const [ahorroSplit, setAhorroSplit] = useState({ habilitado: true, telefonoPct: 50 });
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const cargar = useCallback(async () => {
    setData(null);
    try {
      const [m, a] = mes.split("-").map(Number);
      const d = await api.get<BudgetData>(`/api/budgets?mes=${m}&anio=${a}&quincena=${quincena}`);
      setData(d);
      setIngresos(d.ingresosQuincena > 0 ? String(d.ingresosQuincena) : "");
      setPct({ necesidades: d.regla.necesidades, deseos: d.regla.deseos, ahorro: d.regla.ahorro });
      setAhorroSplit({ habilitado: d.ahorroSplit.habilitado, telefonoPct: d.ahorroSplit.telefonoPct });
      const mapa: Record<number, string> = {};
      for (const it of d.items) mapa[it.categoriaId] = String(it.presupuestado);
      setMontos(mapa);
    } catch {
      toast.error("No se pudieron cargar los presupuestos");
    }
  }, [mes, quincena]);

  useEffect(() => {
    cargar();
  }, [cargar, refresh]);

  useEffect(() => {
    setQuincena(quincenaActual());
  }, [mes]);

  const ingreso = Number(ingresos) || 0;

  const ahorroMonto = (ingreso * pct.ahorro) / 100;
  const telefonoMonto = ahorroSplit.habilitado ? (ahorroMonto * ahorroSplit.telefonoPct) / 100 : 0;
  const ahorroDeudasMonto = ahorroMonto - telefonoMonto;

  const totalPorGrupo = useMemo(() => {
    const t: Record<Grupo, number> = { necesidades: 0, deseos: 0, ahorro: 0 };
    if (!data) return t;
    for (const it of data.items) {
      if (it.grupo && it.grupo in t) t[it.grupo as Grupo] += Number(montos[it.categoriaId] ?? it.presupuestado) || 0;
    }
    return t;
  }, [data, montos]);

  const deseosMonto = (ingreso * pct.deseos) / 100;

  const sumaPct = pct.necesidades + pct.deseos + pct.ahorro;

  const fijasNecesidades = useMemo(() => {
    if (!data) return 0;
    let suma = 0;
    for (const it of data.items) {
      if (it.grupo !== "necesidades") continue;
      suma += Number(montos[it.categoriaId] ?? it.presupuestado) || 0;
    }
    return suma;
  }, [data, montos]);

  const disponibleNecesidades = (ingreso * pct.necesidades) / 100;
  const sobranteNecesidades = disponibleNecesidades - fijasNecesidades;

  function aplicarRegla() {
    if (!data) return;
    const nuevo: Record<number, string> = {};
    for (const g of GRUPOS) {
      if (g.id !== "necesidades") continue;
      const totalGrupo = (ingreso * pct[g.id]) / 100;
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
    toast.success(`Necesidades distribuidas: ${formatCurrency((ingreso * pct.necesidades) / 100)} entre tus categorías fijas`);
  }

  async function guardar() {
    if (!data) return;
    setSaving(true);
    try {
      const [m, a] = mes.split("-").map(Number);
      const items = data.items
        .filter((it) => it.grupo === "necesidades")
        .map((it) => ({
          categoriaId: it.categoriaId,
          monto: Number(montos[it.categoriaId]) || 0,
        }));
      await api.post("/api/budgets", {
        mes: m,
        anio: a,
        quincena,
        ingresosQuincena: ingreso,
        regla: pct,
        ahorroSplit,
        items,
      });
      toast.success("Presupuestos guardados");
      setRefresh((r) => r + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar");
    } finally {
      setSaving(false);
    }
  }

  const detalleAhorro = [
    { label: "Ahorro / Deudas", monto: ahorroDeudasMonto, color: "#06D6A0" },
    { label: "Pago fijo teléfono", monto: telefonoMonto, color: "#F59E0B" },
  ];

  const itemsNecesidades = data?.items.filter((it) => it.grupo === "necesidades") ?? [];
  const hijosPorPadre = new Map<number, BudgetItem[]>();
  const raices = itemsNecesidades.filter((it) => !it.parentId);
  for (const it of itemsNecesidades) {
    if (it.parentId) {
      const arr = hijosPorPadre.get(it.parentId) ?? [];
      arr.push(it);
      hijosPorPadre.set(it.parentId, arr);
    }
  }

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
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold">Regla 50/30/20</h2>
                <p className="text-xs text-muted-foreground">
                  Ingresos de la quincena y porcentajes a cada grupo ·{" "}
                  {sumaPct !== 100 && (
                    <span className={cn("font-medium", sumaPct > 100 ? "text-destructive" : "text-positive")}>
                      suma {sumaPct}%
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
                    value={ingresos}
                    onChange={(e) => setIngresos(e.target.value)}
                    placeholder="0"
                    className={cn("h-9 w-32 font-mono text-right text-sm")}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={aplicarRegla}>
                  Aplicar a categorías
                </Button>
              </div>
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
                    <span className="font-mono text-xs text-muted-foreground">≈ {formatCurrency((ingreso * pct[g.id]) / 100)}</span>
                  </div>

                  {g.id === "ahorro" && (
                    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Partir el ahorro en dos</span>
                        <Switch
                          checked={ahorroSplit.habilitado}
                          onCheckedChange={(v) => setAhorroSplit((s) => ({ ...s, habilitado: v }))}
                          aria-label="Partir ahorro en dos"
                        />
                      </div>
                      {ahorroSplit.habilitado && (
                        <>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>% para teléfono</span>
                            <span className="font-mono font-semibold">{ahorroSplit.telefonoPct}%</span>
                          </div>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[ahorroSplit.telefonoPct]}
                            onValueChange={(v) => setAhorroSplit((s) => ({ ...s, telefonoPct: v[0] }))}
                          />
                          <ul className="space-y-1 pt-1 text-xs">
                            {detalleAhorro.map((d) => (
                              <li key={d.label} className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <span className="size-2 rounded-full" style={{ backgroundColor: d.color }} />
                                  {d.label}
                                </span>
                                <span className="font-mono">{formatCurrency(d.monto)}</span>
                              </li>
                            ))}
                          </ul>
                          {ahorroSplit.telefonoPct >= 100 ? (
                            <p className="flex items-center gap-1 text-[11px] text-destructive">
                              <EyeOff className="size-3" /> Sin parte para ahorro/deudas
                            </p>
                          ) : (
                            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Eye className="size-3" /> Guardás el resto ({100 - ahorroSplit.telefonoPct}%) para ahorro/deudas
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {g.id === "deseos" && (
                    <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                      <p>
                        Todo el % de deseos es tu presupuesto de ocio/regalos: cada gasto en esas categorías se descuenta
                        de acá.
                      </p>
                      <p className="font-mono font-semibold text-foreground">Total: {formatCurrency(deseosMonto)}</p>
                    </div>
                  )}

                  <div className="pt-1">
                    <GrupoBar
                      label={
                        g.id === "ahorro" && ahorroSplit.habilitado
                          ? "Ahorro total (gastado vs ahorrado)"
                          : g.id === "deseos"
                            ? "Gastado en ocio/regalos vs tu presupuesto"
                            : "Gastado vs asignado"
                      }
                      presupuestado={
                        g.id === "deseos" ? deseosMonto : g.id === "ahorro" ? ahorroMonto : totalPorGrupo[g.id]
                      }
                      gastado={gastadoGrupo(data.items, g.id)}
                      color={g.color}
                    />
                  </div>
                </div>
              ))}
            </div>
            {ahorroSplit.habilitado && (
              <p className="mt-3 text-xs text-muted-foreground">
                Del ahorro de la quincena ({formatCurrency(ahorroMonto)}), vas a apartar {formatCurrency(telefonoMonto)} fijos
                para el teléfono actual y {formatCurrency(ahorroDeudasMonto)} para ahorro/pagar deudas. Podés desactivar esta
                división cuando quieras.
              </p>
            )}
          </div>

          <div className="glass glow-hover rounded-2xl border border-border p-5">
            <h2 className="mb-1 font-semibold">Presupuestos por categoría</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Gastos fijos de necesidades: asigná el monto por quincena. Podés subirlo o bajarlo cuando quieras.
            </p>

            <div
              className={cn(
                "mb-5 rounded-xl border p-4",
                sobranteNecesidades >= 0 ? "border-positive/30 bg-positive/5" : "border-destructive/30 bg-destructive/5"
              )}
            >
              <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">Tus gastos fijos suman</span>
                <span className="font-mono text-lg font-bold">{formatCurrency(fijasNecesidades)}</span>
              </p>
              <p className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Del {pct.necesidades}% de necesidades sobre tu ingreso de la quincena ({formatCurrency(ingreso)}) =
                  {formatCurrency(disponibleNecesidades)}
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-semibold",
                    sobranteNecesidades >= 0 ? "text-positive" : "text-destructive"
                  )}
                >
                  {sobranteNecesidades >= 0 ? "Te sobran" : "Te faltan"} {formatCurrency(Math.abs(sobranteNecesidades))}
                </span>
              </p>
            </div>

            <div className="space-y-3">
              {raices.map((raiz) => {
                const hijos = hijosPorPadre.get(raiz.categoriaId) ?? [];
                return (
                  <div key={raiz.categoriaId} className="space-y-2">
                    <FilaCategoria
                      it={raiz}
                      monto={montos[raiz.categoriaId] ?? ""}
                      onChange={(v) => setMontos((m) => ({ ...m, [raiz.categoriaId]: v }))}
                      esPadre={hijos.length > 0}
                    />
                    {hijos.map((hijo) => (
                      <div key={hijo.categoriaId} className="pl-4 sm:pl-8">
                        <FilaCategoria
                          it={hijo}
                          monto={montos[hijo.categoriaId] ?? ""}
                          onChange={(v) => setMontos((m) => ({ ...m, [hijo.categoriaId]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
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

function FilaCategoria({
  it,
  monto,
  onChange,
  esPadre,
}: {
  it: BudgetItem;
  monto: string;
  onChange: (v: string) => void;
  esPadre?: boolean;
}) {
  const presup = Number(monto) || 0;
  const label = esPadre ? "Total de sus servicios" : "Gastado";
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:gap-4",
        esPadre ? "border-dashed bg-muted/30" : "border-border bg-card"
      )}
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
            {label} {formatCurrency(it.gastado)}
            {it.grupo && ` · ${GRUPOS.find((g) => g.id === it.grupo)?.label}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative h-2 w-full flex-1 overflow-hidden rounded-full bg-muted sm:w-40">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (it.gastado / (presup || 1)) * 100)}%`,
              background: it.gastado > presup ? "#EF4444" : it.color,
            }}
          />
        </div>
        <Input
          type="number"
          min={0}
          value={monto}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-9 w-32 font-mono text-right text-sm")}
          placeholder="0"
        />
      </div>
    </div>
  );
}