"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Droplets, TrendingDown, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRangeDates } from "@/stores/range";
import { api, DATA_CHANGED_EVENT } from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { DateRangePicker } from "@/components/date-range-picker";
import { SummaryCard } from "@/components/summary-card";
import { BudgetBar } from "@/components/budget-bar";
import { TransactionRow } from "@/components/transaction-row";
import { TransactionModal } from "@/components/transaction-modal";
import { ChartCard, DonutChart, NetWorthChart, FlowChart, PerAccountChart } from "@/components/dashboard-charts";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const range = useRangeDates();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<DashboardData>(`/api/dashboard?from=${range.from}&to=${range.to}`);
      setData(d);
    } catch {
      toast.error("No se pudo cargar el dashboard");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    cargar();
  }, [cargar, refresh]);

  useEffect(() => {
    const bump = () => setRefresh((r) => r + 1);
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) bump();
    };
    window.addEventListener(DATA_CHANGED_EVENT, bump);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, bump);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  const key = `${range.from}_${range.to}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <DateRangePicker />
          {loading && data && <span className="text-xs text-muted-foreground">Actualizando…</span>}
        </div>
        {data && !loading && (
          <div className="flex items-center gap-4 text-sm">
            <span className="font-mono text-positive">+{formatCurrency(data.totales.ingresos)}</span>
            <span className="font-mono text-destructive">−{formatCurrency(data.totales.gastos)}</span>
            <span className="hidden items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground sm:flex">
              {formatShortDate(range.from)} → {formatShortDate(range.to)}
            </span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-6"
        >
          {!data ? (
            <LoadingSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Patrimonio neto" value={formatCurrency(data.summary.patrimonio)} icon={Wallet} color="#2D3748" />
                <SummaryCard label="Liquidez" value={formatCurrency(data.summary.liquidez)} icon={Droplets} color="#4A5568" hint="Débito + efectivo" />
                <SummaryCard label="Deudas de tarjetas" value={formatCurrency(data.summary.deudas)} icon={TrendingDown} color="#B86A62" />
                <SummaryCard label="Inversiones" value={formatCurrency(data.summary.inversiones)} icon={TrendingUp} color="#5A8F6D" />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Gastos por categoría" subtitle="Distribución del período">
                  <DonutChart data={data.donut} />
                  {data.donut.length > 0 && (
                    <div className="mt-3 grid max-h-36 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                      {data.donut.slice(0, 8).map((d) => {
                        const total = data.donut.reduce((s, x) => s + x.monto, 0);
                        return (
                          <div key={d.categoria} className="flex items-center gap-2 text-xs">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.categoria}</span>
                            <span className="font-mono">
                              {formatCurrency(d.monto)}
                              <span className="text-muted-foreground"> · {Math.round((d.monto / total) * 100)}%</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ChartCard>

                <ChartCard title="Evolución del patrimonio" subtitle="En el período seleccionado">
                  <NetWorthChart data={data.evolucion} />
                </ChartCard>

                <ChartCard title="Ingresos vs gastos" subtitle="Agrupado por el período">
                  <FlowChart data={data.flujo} />
                </ChartCard>

                <ChartCard title="Gasto por cuenta" subtitle="¿Qué tarjeta o cuenta usas más?">
                  <PerAccountChart data={data.gastosPorCuenta} />
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="glass glow-hover rounded-2xl border border-border p-5 lg:col-span-1">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Presupuesto 50/30/20</h3>
                    <Link href="/presupuesto/configuracion" className="text-xs text-primary hover:underline">
                      Editar
                    </Link>
                  </div>
                  <div className="space-y-5">
                    <BudgetBar grupo="necesidades" presupuestado={data.presupuesto.necesidades.presupuestado} gastado={data.presupuesto.necesidades.gastado} />
                    <BudgetBar grupo="deseos" presupuestado={data.presupuesto.deseos.presupuestado} gastado={data.presupuesto.deseos.gastado} />
                    <BudgetBar grupo="ahorro" presupuestado={data.presupuesto.ahorro.presupuestado} gastado={data.presupuesto.ahorro.gastado} />
                    {data.reservado > 0 && (
                      <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                        {formatCurrency(data.reservado)} reservados en apartados esta quincena ·{" "}
                        <Link href="/presupuesto/apartados" className="text-primary hover:underline">
                          ver apartados
                        </Link>
                      </p>
                    )}
                  </div>
                </div>

                <div className="glass glow-hover rounded-2xl border border-border p-5 lg:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Transacciones recientes</h3>
                    <Link href="/transacciones" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      Ver todas <ArrowRight className="size-3" />
                    </Link>
                  </div>
                  <div className="divide-y divide-border/60">
                    {data.recientes.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={() => setModalOpen(true)}
        className="btn-gradient fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white shadow-2xl shadow-slate-900/50 transition-transform hover:scale-105 md:bottom-8 md:right-8"
      >
        <Plus className="size-5" />
        <span className="hidden sm:inline">Registrar movimiento</span>
        <span className="sm:hidden">Movimiento</span>
      </button>

      <TransactionModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
