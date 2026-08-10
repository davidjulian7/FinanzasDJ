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
import { api } from "@/lib/api";
import type { AccountRow, AccountTipo } from "@/lib/types";
import { IconByName } from "@/components/icon-registry";
import { cn } from "@/lib/utils";

const COLORES = ["#7C3AED", "#3B82F6", "#06D6A0", "#F59E0B", "#EF4444", "#10B981", "#0EA5E9", "#EC4899", "#84CC16", "#A855F7"];
const ICONOS = ["Landmark", "Wallet", "Banknote", "CreditCard", "TrendingUp", "PiggyBank", "HandCoins", "Gift"];

const TIPOS: Array<{ id: AccountTipo; label: string }> = [
  { id: "debito", label: "Débito" },
  { id: "credito", label: "Crédito" },
  { id: "efectivo", label: "Efectivo" },
  { id: "inversion", label: "Inversión" },
];

export function AccountModal({
  open,
  onOpenChange,
  cuenta,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cuenta?: AccountRow | null;
  onSaved?: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<AccountTipo>("debito");
  const [saldoActual, setSaldoActual] = useState("");
  const [limite, setLimite] = useState("");
  const [corte, setCorte] = useState("");
  const [pago, setPago] = useState("");
  const [color, setColor] = useState("#7C3AED");
  const [icono, setIcono] = useState("Wallet");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(cuenta?.nombre ?? "");
    setTipo(cuenta?.tipo ?? "debito");
    setSaldoActual(cuenta ? String(Math.round(cuenta.saldoActual)) : "");
    setLimite(cuenta?.limiteCredito ? String(cuenta.limiteCredito) : "");
    setCorte(cuenta?.fechaCorte ? String(cuenta.fechaCorte) : "");
    setPago(cuenta?.fechaPago ? String(cuenta.fechaPago) : "");
    setColor(cuenta?.color ?? "#7C3AED");
    setIcono(cuenta?.icono ?? "Wallet");
  }, [open, cuenta]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return toast.error("El nombre es obligatorio");
    const body = {
      nombre,
      tipo,
      saldoActual: Number(saldoActual) || 0,
      limiteCredito: tipo === "credito" && limite ? Number(limite) : null,
      fechaCorte: tipo === "credito" && corte ? Number(corte) : null,
      fechaPago: tipo === "credito" && pago ? Number(pago) : null,
      color,
      icono,
    };
    setLoading(true);
    try {
      if (cuenta) {
        await api.put(`/api/accounts/${cuenta.id}`, body);
        toast.success("Cuenta actualizada");
      } else {
        await api.post("/api/accounts", body);
        toast.success("Cuenta creada");
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cuenta ? "Editar cuenta" : "Agregar cuenta"}</DialogTitle>
          <DialogDescription>Configurá los datos de la cuenta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="ac-nombre">Nombre</Label>
              <Input id="ac-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Banco Principal" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de cuenta</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as AccountTipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-saldo">{tipo === "credito" ? "Deuda actual" : "Saldo actual"}</Label>
              <Input id="ac-saldo" type="number" value={saldoActual} onChange={(e) => setSaldoActual(e.target.value)} className="font-mono" placeholder="0" />
            </div>
            {tipo === "credito" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ac-limite">Límite de crédito</Label>
                  <Input id="ac-limite" type="number" value={limite} onChange={(e) => setLimite(e.target.value)} className="font-mono" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ac-corte">Día de corte</Label>
                  <Input id="ac-corte" type="number" min={1} max={31} value={corte} onChange={(e) => setCorte(e.target.value)} placeholder="12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ac-pago">Día límite de pago</Label>
                  <Input id="ac-pago" type="number" min={1} max={31} value={pago} onChange={(e) => setPago(e.target.value)} placeholder="5" />
                </div>
              </>
            )}
            <div className="col-span-2 space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn("size-7 rounded-full transition-transform", color === c && "scale-110 ring-2 ring-ring ring-offset-2")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Icono</Label>
              <div className="flex flex-wrap gap-2">
                {ICONOS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcono(i)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg border transition-colors",
                      icono === i ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <IconByName name={i} className="size-4.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-gradient" disabled={loading}>
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
