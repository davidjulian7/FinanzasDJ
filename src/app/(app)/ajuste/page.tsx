"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ArrowRight, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { calcularDiferenciaAjuste, resumirAjuste, type ResultadoAjuste } from "@/lib/ajuste-calculos";
import { formatCurrency, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { IconByName } from "@/components/icon-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { CuentaAjuste, AjusteStatus } from "@/lib/ajuste";

const TIPO_ORDEN: Record<string, number> = {
  debito: 0,
  credito: 1,
  efectivo: 3,
  inversion: 2,
};

function nombreBaseCuenta(nombre: string): string {
  return nombre
    .trim()
    .replace(/^tdc[\s-]+/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/\s+/g, " ")
    .trim();
}

export default function AjustePage() {
  const router = useRouter();
  const [status, setStatus] = useState<AjusteStatus | null>(null);
  const [cuentas, setCuentas] = useState<CuentaAjuste[]>([]);
  const [saldos, setSaldos] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [resultado, setResultado] = useState<ResultadoAjuste | null>(null);

  const cuentasOrdenadas = useMemo(() => {
    return [...cuentas].sort((a, b) => {
      const porNombre = nombreBaseCuenta(a.nombre).localeCompare(
        nombreBaseCuenta(b.nombre),
        "es-MX"
      );
      if (porNombre !== 0) return porNombre;
      return (TIPO_ORDEN[a.tipo] ?? 2) - (TIPO_ORDEN[b.tipo] ?? 2);
    });
  }, [cuentas]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [statusData, cuentasData] = await Promise.all([
        api.get<AjusteStatus>("/api/ajuste/status"),
        api.get<CuentaAjuste[]>("/api/ajuste"),
      ]);
      setStatus(statusData);
      setCuentas(cuentasData);
      const initial: Record<number, string> = {};
      for (const c of cuentasData) {
        initial[c.cuentaId] = "";
      }
      setSaldos(initial);
    } catch {
      toast.error("No se pudieron cargar los datos del ajuste");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function handleSaldoChange(cuentaId: number, value: string) {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    setSaldos((prev) => ({ ...prev, [cuentaId]: cleaned }));
  }

  function getDiferencia(cuenta: CuentaAjuste): number | null {
    const raw = saldos[cuenta.cuentaId];
    if (raw === "" || raw === undefined || raw === null) return null;
    const valor = parseFloat(raw);
    if (!Number.isFinite(valor)) return null;
    return calcularDiferenciaAjuste(cuenta.tipo, cuenta.saldoActual, valor);
  }

  function isFormValid(): boolean {
    for (const c of cuentas) {
      const raw = saldos[c.cuentaId];
      if (raw === "" || raw === undefined) continue;
      const valor = parseFloat(raw);
      if (Number.isFinite(valor)) return true;
    }
    return false;
  }

  async function aplicarAjuste() {
    if (!isFormValid()) {
      toast.error("Ingresa el saldo real de al menos una cuenta");
      return;
    }

    setProcesando(true);
    try {
      const cuentasPayload = cuentas
        .filter((c) => {
          const raw = saldos[c.cuentaId];
          if (raw === "" || raw === undefined) return false;
          return Number.isFinite(parseFloat(raw));
        })
        .map((c) => ({
          cuentaId: c.cuentaId,
          saldoReal: parseFloat(saldos[c.cuentaId]),
        }));

      const result = await api.post<ResultadoAjuste>(
        "/api/ajuste",
        { fecha: todayISO(), cuentas: cuentasPayload },
        { requireOnline: true }
      );

      if (![result?.transaccionesCreadas, result?.diferenciaTotal, result?.totalGastos, result?.totalIngresos].every(Number.isFinite)) {
        throw new Error("No se pudo confirmar el resultado del ajuste. Revisa los saldos antes de volver a intentarlo.");
      }

      setResultado(result);
      setCompletado(true);

      toast.success(`Ajuste aplicado. ${result.transaccionesCreadas} transacciones creadas.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al procesar el ajuste";
      toast.error(msg);
    } finally {
      setProcesando(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (completado && resultado) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl border border-border p-8 text-center"
        >
          <CheckCircle2 className="mx-auto mb-4 size-16 text-positive" />
          <h2 className="mb-2 text-xl font-bold">Ajuste completado</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {resultado.transaccionesCreadas === 0
              ? "Los saldos ya coincidían. No se crearon transacciones."
              : <>Se crearon <strong>{resultado.transaccionesCreadas}</strong> transacciones de ajuste.</>}
          </p>
          <dl className="mb-6 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-6">
              <dt>Gastos no registrados</dt>
              <dd className="font-mono text-destructive">{formatCurrency(resultado.totalGastos)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt>Ingresos no registrados</dt>
              <dd className="font-mono text-positive">{formatCurrency(resultado.totalIngresos)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt>Diferencia neta</dt>
              <dd className="font-mono">{formatCurrency(resultado.diferenciaTotal)}</dd>
            </div>
          </dl>
          <Button onClick={() => router.push("/dashboard")} className="gap-2">
            Ir al dashboard <ArrowRight className="size-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const resumen = resumirAjuste(cuentas.map((cuenta) => getDiferencia(cuenta) ?? 0));
  const diferenciaTotal = resumen.diferenciaTotal;
  const haySaldos = isFormValid();
  const cuentasConSaldo = cuentas.filter((c) => {
    const raw = saldos[c.cuentaId];
    if (raw === "" || raw === undefined) return false;
    return Number.isFinite(parseFloat(raw));
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-3">
          <div className="btn-gradient flex size-10 items-center justify-center rounded-xl">
            <Wrench className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Ajuste de Cuentas</h1>
            <p className="text-sm text-muted-foreground">
              {status?.diasSinAjuste != null && status.diasSinAjuste > 900
                ? "Primer ajuste — ingresa el saldo actual de cada cuenta"
                : `Han pasado ${status?.diasSinAjuste ?? "?"} días desde el último ajuste`}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-xs text-muted-foreground">
            Ingresa el saldo <strong>real</strong> de las cuentas que quieras ajustar. Puedes hacer ajuste parcial — las cuentas sin saldo se omiten.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cuentasOrdenadas.map((cuenta, index) => {
          const diff = getDiferencia(cuenta);
          const esCredito = cuenta.tipo === "credito";
          const iniciaGrupo = index === 0 ||
            nombreBaseCuenta(cuenta.nombre) !== nombreBaseCuenta(cuentasOrdenadas[index - 1].nombre);
          return (
            <motion.div
              key={cuenta.cuentaId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "glass glow-hover relative overflow-hidden rounded-2xl border border-border p-5",
                iniciaGrupo && "sm:col-start-1"
              )}
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${cuenta.color}, ${cuenta.color}55)` }}
              />
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${cuenta.color}22`, color: cuenta.color }}
                >
                  <IconByName name={cuenta.icono} className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">{cuenta.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {esCredito ? "Deuda actual" : "Saldo actual"}: {formatCurrency(cuenta.saldoActual)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {esCredito ? "Deuda real en la tarjeta" : "Saldo real en la cuenta"}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={saldos[cuenta.cuentaId] ?? ""}
                    onChange={(e) => handleSaldoChange(cuenta.cuentaId, e.target.value)}
                    className="pl-7 font-mono text-lg"
                  />
                </div>
              </div>

              {diff !== null && Math.abs(diff) >= 0.01 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2"
                >
                  <span className="text-xs text-muted-foreground">Diferencia</span>
                  <span className={`font-mono text-sm font-semibold ${diff < 0 ? "text-destructive" : "text-positive"}`}>
                    {diff < 0 ? "−" : "+"}{formatCurrency(Math.abs(diff))}
                  </span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {haySaldos && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl border border-border p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">Resumen del ajuste</span>
            <span className="text-xs text-muted-foreground">{cuentasConSaldo} de {cuentas.length} cuentas</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Diferencia total</span>
            <span className={`font-mono text-lg font-bold ${diferenciaTotal < 0 ? "text-destructive" : diferenciaTotal > 0 ? "text-positive" : ""}`}>
              {diferenciaTotal < 0 ? "−" : "+"}{formatCurrency(Math.abs(diferenciaTotal))}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {resumen.transaccionesCreadas === 0
              ? "Las cuentas están cuadradas — no se crearán transacciones"
              : `Se registrarán ${formatCurrency(resumen.totalGastos)} de gastos y ${formatCurrency(resumen.totalIngresos)} de ingresos.`}
          </p>
        </motion.div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={aplicarAjuste}
          disabled={!haySaldos || procesando}
          className="btn-gradient gap-2 px-6"
        >
          {procesando ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Procesando...
            </>
          ) : (
            <>
              <Wrench className="size-4" />
              Aplicar ajuste
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
