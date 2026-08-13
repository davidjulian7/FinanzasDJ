"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReference } from "@/stores/reference";
import { api } from "@/lib/api";
import { formatCurrency, todayISO } from "@/lib/format";
import type { ApartadoRow } from "@/lib/types";

export function ApartadoPagoModal({
  open,
  onOpenChange,
  apartado,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  apartado: ApartadoRow | null;
  onSaved?: () => void;
}) {
  const { accounts } = useReference();
  const [loading, setLoading] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [accountId, setAccountId] = useState("");
  const [fecha, setFecha] = useState(todayISO());

  useEffect(() => {
    if (!open || !apartado) return;
    setDescripcion(`Pago: ${apartado.nombre}`);
    setMonto(String(apartado.juntado > 0 ? apartado.juntado : apartado.cuotaEfectiva));
    setAccountId(apartado.cuentaId ? String(apartado.cuentaId) : "");
    setFecha(todayISO());
  }, [open, apartado]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!apartado) return;
    const m = Number(monto);
    if (!Number.isFinite(m) || m <= 0) return toast.error("El monto debe ser mayor a cero");
    if (!accountId) return toast.error("Seleccioná la cuenta de pago");

    setLoading(true);
    try {
      await api.post(`/api/apartados/${apartado.id}/pago`, {
        monto: m,
        accountId: Number(accountId),
        fecha,
        descripcion,
      });
      toast.success(`Pago registrado: ${apartado.nombre}`);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar el pago");
    } finally {
      setLoading(false);
    }
  }

  const sugerido = apartado?.juntado ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar desde apartado</DialogTitle>
          <DialogDescription>
            {apartado ? (
              <span>
                {apartado.nombre} · juntado <span className="font-mono">{formatCurrency(sugerido)}</span> de{" "}
                <span className="font-mono">{formatCurrency(apartado.montoObjetivo)}</span>. El gasto no volverá a contar
                en el presupuesto.
              </span>
            ) : (
              "Cargando…"
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ap-desc">Descripción</Label>
            <Input id="ap-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ap-monto">Monto</Label>
              <Input id="ap-monto" type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-fecha">Fecha</Label>
              <Input id="ap-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ap-cuenta">Cuenta de pago</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="ap-cuenta">
                <SelectValue placeholder="Elegí una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-gradient" disabled={loading || !apartado}>
              {loading ? "Registrando…" : "Registrar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}