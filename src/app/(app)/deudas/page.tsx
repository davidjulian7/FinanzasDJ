"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CircleDollarSign, HandCoins, Pencil, Plus, Trash2, CreditCard, CalendarCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useReference } from "@/stores/reference";
import type { DebtRow, CuotaRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DebtsPage() {
  const [deudas, setDeudas] = useState<DebtRow[] | null>(null);
  const [cuotas, setCuotas] = useState<CuotaRow[] | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [crearOpen, setCrearOpen] = useState(false);
  const [editando, setEditando] = useState<DebtRow | null>(null);
  const [eliminando, setEliminando] = useState<DebtRow | null>(null);
  const [pagando, setPagando] = useState<DebtRow | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([
        api.get<DebtRow[]>("/api/debts"),
        api.get<CuotaRow[]>("/api/cuotas"),
      ]);
      setDeudas(d);
      setCuotas(c);
    } catch {
      toast.error("No se pudieron cargar las deudas");
      setDeudas([]);
      setCuotas([]);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar, refresh]);

  const porPagar = (deudas ?? []).filter((d) => d.tipo === "por_pagar");
  const porCobrar = (deudas ?? []).filter((d) => d.tipo === "por_cobrar");
  const cuotasActivas = (cuotas ?? []).filter((c) => c.pagadas < c.meses);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {deudas !== null && cuotas !== null
            ? `${porPagar.length} deudas · ${cuotasActivas.length} cuotas activas · ${porCobrar.length} por cobrar`
            : "Cargando…"}
        </p>
        <Button className="btn-gradient gap-1.5" onClick={() => { setEditando(null); setCrearOpen(true); }}>
          <Plus className="size-4" /> Nueva deuda
        </Button>
      </div>

      {deudas === null || cuotas === null ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-destructive">
              <HandCoins className="size-4" /> Debo ({porPagar.length})
            </h2>
            {porPagar.length === 0 ? (
              <Empty text="No tenés deudas por pagar 🎉" />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {porPagar.map((d) => (
                  <DebtCard key={d.id} debt={d} onPagar={setPagando} onEditar={setEditando} onEliminar={setEliminando} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-warning">
              <CreditCard className="size-4" /> Compras a meses ({cuotasActivas.length})
            </h2>
            {cuotasActivas.length === 0 ? (
              <Empty text="No tenés compras a meses activas" />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {cuotasActivas.map((c) => (
                  <CuotaCard key={c.id} cuota={c} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-positive">
              <CircleDollarSign className="size-4" /> Me deben ({porCobrar.length})
            </h2>
            {porCobrar.length === 0 ? (
              <Empty text="No te deben dinero" />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {porCobrar.map((d) => (
                  <DebtCard key={d.id} debt={d} onPagar={setPagando} onEditar={setEditando} onEliminar={setEliminando} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <DebtForm
        open={crearOpen}
        onOpenChange={(v) => {
          setCrearOpen(v);
          if (!v) setEditando(null);
        }}
        debt={editando}
        onSaved={() => setRefresh((r) => r + 1)}
      />

      <PaymentDialog
        debt={pagando}
        onClose={() => setPagando(null)}
        onDone={() => setRefresh((r) => r + 1)}
      />

      <Dialog open={!!eliminando} onOpenChange={(v) => !v && setEliminando(null)}>
        <DialogContent className="glass sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar deuda</DialogTitle>
            <DialogDescription>¿Seguro que querés eliminar “{eliminando?.nombre}”?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEliminando(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!eliminando) return;
                try {
                  await api.delete(`/api/debts/${eliminando.id}`);
                  toast.success("Deuda eliminada");
                  setEliminando(null);
                  setRefresh((r) => r + 1);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DebtCard({
  debt,
  onPagar,
  onEditar,
  onEliminar,
}: {
  debt: DebtRow;
  onPagar: (d: DebtRow) => void;
  onEditar: (d: DebtRow) => void;
  onEliminar: (d: DebtRow) => void;
}) {
  const esDeuda = debt.tipo === "por_pagar";
  const pagado = debt.montoOriginal > 0 ? Math.min(100, ((debt.montoOriginal - debt.saldoPendiente) / debt.montoOriginal) * 100) : 0;

  return (
    <div className="glass glow-hover group rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{debt.nombre}</p>
          <p className="text-xs text-muted-foreground">{debt.personaOAcreedor}</p>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => onEditar(debt)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => onEliminar(debt)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{esDeuda ? "Saldo pendiente" : "Te deben"}</p>
          <p className={cn("font-mono text-2xl font-bold", esDeuda ? "text-destructive" : "text-positive")}>
            {formatCurrency(debt.saldoPendiente)}
          </p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">de {formatCurrency(debt.montoOriginal)}</p>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", esDeuda ? "bg-destructive/70" : "bg-positive")}
          style={{ width: `${pagado}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{Math.round(pagado)}% pagado</span>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onPagar(debt)}>
          <CircleDollarSign className="size-3.5" />
          {esDeuda ? "Registrar pago" : "Registrar cobro"}
        </Button>
      </div>
    </div>
  );
}

function CuotaCard({ cuota }: { cuota: CuotaRow }) {
  const restantes = cuota.meses - cuota.pagadas;
  const saldoPendiente = cuota.cuota * restantes;
  const pagado = cuota.meses > 0 ? (cuota.pagadas / cuota.meses) * 100 : 0;

  return (
    <div className="glass glow-hover rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{cuota.descripcion}</p>
          <p className="text-xs text-muted-foreground">{cuota.cuenta}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
          <CalendarCheck className="size-3" />
          {restantes} {restantes === 1 ? "mes" : "meses"}
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p className="font-mono text-2xl font-bold text-warning">
            {formatCurrency(saldoPendiente)}
          </p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          cuota {formatCurrency(cuota.cuota)}/mes
        </p>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-warning/70 transition-all duration-500"
          style={{ width: `${pagado}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{cuota.pagadas}/{cuota.meses} cuotas pagadas</span>
        <span>{Math.round(pagado)}%</span>
      </div>
    </div>
  );
}

function DebtForm({
  open,
  onOpenChange,
  debt,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  debt: DebtRow | null;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"por_pagar" | "por_cobrar">("por_pagar");
  const [persona, setPersona] = useState("");
  const [montoOriginal, setMontoOriginal] = useState("");
  const [saldo, setSaldo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(debt?.nombre ?? "");
    setTipo(debt?.tipo ?? "por_pagar");
    setPersona(debt?.personaOAcreedor ?? "");
    setMontoOriginal(debt ? String(debt.montoOriginal) : "");
    setSaldo(debt ? String(debt.saldoPendiente) : "");
  }, [open, debt]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return toast.error("El nombre es obligatorio");
    setLoading(true);
    try {
      const body = { nombre, tipo, personaOAcreedor: persona, montoOriginal: Number(montoOriginal) || 0, saldoPendiente: Number(saldo) || Number(montoOriginal) || 0 };
      if (debt) {
        await api.patch(`/api/debts/${debt.id}`, body);
        toast.success("Deuda actualizada");
      } else {
        await api.post("/api/debts", body);
        toast.success("Deuda creada");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{debt ? "Editar deuda" : "Nueva deuda"}</DialogTitle>
          <DialogDescription>Registrá un préstamo, acreedor o deuda pendiente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Préstamo personal" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "por_pagar" | "por_cobrar")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="por_pagar">Por pagar (debo)</SelectItem>
                  <SelectItem value="por_cobrar">Por cobrar (me deben)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Persona / entidad</Label>
              <Input value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="Acreedor o deudor" />
            </div>
            <div className="space-y-2">
              <Label>Monto original</Label>
              <Input type="number" min={0} value={montoOriginal} onChange={(e) => setMontoOriginal(e.target.value)} className="font-mono" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Saldo pendiente</Label>
              <Input type="number" min={0} value={saldo} onChange={(e) => setSaldo(e.target.value)} className="font-mono" placeholder="0" />
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

function PaymentDialog({ debt, onClose, onDone }: { debt: DebtRow | null; onClose: () => void; onDone: () => void }) {
  const { accounts } = useReference();
  const [monto, setMonto] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debt) return;
    setMonto("");
    setCuentaId("");
  }, [debt]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (!debt) return;
    const m = Number(monto);
    if (!Number.isFinite(m) || m <= 0) return toast.error("Ingresá un monto válido");
    if (m > debt.saldoPendiente) return toast.error("El monto supera el saldo pendiente");
    setLoading(true);
    try {
      await api.post(`/api/debts/${debt.id}/pago`, { monto: m, cuentaId: cuentaId ? Number(cuentaId) : null });
      toast.success(debt.tipo === "por_pagar" ? "Pago registrado" : "Cobro registrado");
      onClose();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  }

  const esDeuda = debt?.tipo === "por_pagar";

  return (
    <Dialog open={!!debt} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{esDeuda ? "Registrar pago" : "Registrar cobro"}</DialogTitle>
          <DialogDescription>
            {debt?.nombre} · pendiente <span className="font-mono">{debt ? formatCurrency(debt.saldoPendiente) : ""}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={registrar} className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="pago-monto">Monto</Label>
            <Input id="pago-monto" type="number" min={0} step="0.01" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} className="font-mono" placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Cuenta asociada (opcional)</Label>
            <Select value={cuentaId} onValueChange={setCuentaId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin cuenta (solo actualiza la deuda)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin cuenta</SelectItem>
                {accounts.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Si elegís una cuenta, se registrará un movimiento de {esDeuda ? "gasto" : "ingreso"} y se actualizará su saldo.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-gradient" disabled={loading}>
              {loading ? "Guardando…" : esDeuda ? "Registrar pago" : "Registrar cobro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="glass rounded-2xl border border-border py-12 text-center text-sm text-muted-foreground">{text}</div>
  );
}
