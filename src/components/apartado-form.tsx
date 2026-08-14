"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { IconByName } from "@/components/icon-registry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useReference } from "@/stores/reference";
import type { ApartadoRow, ApartadoPeriodicidad } from "@/lib/types";

const COLORES = ["#7C3AED", "#3B82F6", "#06D6A0", "#F59E0B", "#EF4444", "#10B981", "#0EA5E9", "#EC4899", "#84CC16", "#A855F7"];
const ICONOS = ["Home", "Phone", "Dumbbell", "Laptop", "Tv", "Clapperboard", "Car", "Plane", "PiggyBank", "HeartPulse", "GraduationCap", "Wallet"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface FormState {
  nombre: string;
  montoObjetivo: string;
  periodicidad: ApartadoPeriodicidad;
  diaPago: string;
  mesPago: string;
  cuotaFija: boolean;
  montoQuincena: string;
  budgetGroupId: string;
  categoriaId: string;
  cuentaId: string;
  icono: string;
  color: string;
  nota: string;
  activo: boolean;
}

const EMPTY: FormState = {
  nombre: "",
  montoObjetivo: "",
  periodicidad: "mensual",
  diaPago: "5",
  mesPago: "",
  cuotaFija: false,
  montoQuincena: "",
  budgetGroupId: "",
  categoriaId: "",
  cuentaId: "",
  icono: "Home",
  color: COLORES[0],
  nota: "",
  activo: true,
};

export function ApartadoForm({
  open,
  onOpenChange,
  initialData,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData: ApartadoRow | null;
  onSaved: () => void;
}) {
  const { accounts, expenseCategories } = useReference();
  const [groups, setGroups] = useState<Array<{ id: number; key: string; label: string; color: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const fetchGroups = useCallback(async () => {
    try {
      const grps = await api.get<Array<{ id: number; key: string; label: string; color: string }>>("/api/budget-groups");
      setGroups(grps);
    } catch {
      toast.error("No se pudieron cargar los grupos");
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        nombre: initialData.nombre,
        montoObjetivo: String(initialData.montoObjetivo),
        periodicidad: initialData.periodicidad,
        diaPago: String(initialData.diaPago),
        mesPago: initialData.mesPago ? String(initialData.mesPago) : "",
        cuotaFija: initialData.montoQuincena != null,
        montoQuincena: initialData.montoQuincena != null ? String(initialData.montoQuincena) : "",
        budgetGroupId: initialData.budgetGroupId ? String(initialData.budgetGroupId) : "",
        categoriaId: initialData.categoriaId ? String(initialData.categoriaId) : "",
        cuentaId: initialData.cuentaId ? String(initialData.cuentaId) : "",
        icono: initialData.icono,
        color: initialData.color,
        nota: initialData.nota ?? "",
        activo: initialData.activo,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, initialData]);

  const objetivo = Number(form.montoObjetivo);
  const quincenasCiclo = form.periodicidad === "mensual" ? 2 : 24;
  const sugerida = Number.isFinite(objetivo) && objetivo > 0 ? Math.round((objetivo / quincenasCiclo) * 100) / 100 : null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const categoriasGasto = expenseCategories.filter((c) => c.tipo === "gasto");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.error("Escribe un nombre");
    if (!Number.isFinite(objetivo) || objetivo <= 0) return toast.error("El monto objetivo debe ser mayor a cero");
    const dia = Number(form.diaPago);
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) return toast.error("El día de pago debe ser entre 1 y 31");
    if (form.periodicidad === "anual") {
      const m = Number(form.mesPago);
      if (!Number.isInteger(m) || m < 1 || m > 12) return toast.error("Elige el mes de pago");
    }
    if (!form.budgetGroupId) return toast.error("Elige el grupo de presupuesto");

    const body = {
      nombre: form.nombre,
      montoObjetivo: objetivo,
      periodicidad: form.periodicidad,
      diaPago: dia,
      mesPago: form.periodicidad === "anual" ? Number(form.mesPago) : null,
      budgetGroupId: Number(form.budgetGroupId),
      categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
      cuentaId: form.cuentaId ? Number(form.cuentaId) : null,
      montoQuincena: form.cuotaFija ? Number(form.montoQuincena) : null,
      icono: form.icono,
      color: form.color,
      nota: form.nota || null,
      activo: form.activo,
    };
    if (form.cuotaFija) {
      const n = Number(form.montoQuincena);
      if (!Number.isFinite(n) || n <= 0) return toast.error("La cuota de quincena debe ser mayor a cero");
      body.montoQuincena = n;
    }

    setSubmitting(true);
    try {
      if (initialData) {
        await api.patch(`/api/apartados/${initialData.id}`, body);
        toast.success("Apartado actualizado");
      } else {
        await api.post("/api/apartados", body);
        toast.success("Apartado creado");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar apartado" : "Nuevo apartado"}</DialogTitle>
          <DialogDescription>
            Define un plan de reserva quincenal hacia un pago mensual o anual. No mueve dinero: solo aparta del
            presupuesto de la quincena.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="ap-nombre">Nombre *</Label>
              <Input id="ap-nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Renta, Línea telefónica, Crunchyroll" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-objetivo">Monto objetivo (pago) *</Label>
              <Input id="ap-objetivo" type="number" min="0" step="0.01" value={form.montoObjetivo} onChange={(e) => set("montoObjetivo", e.target.value)} className="font-mono" placeholder="3000" />
            </div>
            <div className="space-y-2">
              <Label>Periodicidad del pago *</Label>
              <Select value={form.periodicidad} onValueChange={(v) => set("periodicidad", v as ApartadoPeriodicidad)}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual (2 quincenas)</SelectItem>
                  <SelectItem value="anual">Anual (24 quincenas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-diapago">Día de pago *</Label>
              <Input id="ap-diapago" type="number" min={1} max={31} value={form.diaPago} onChange={(e) => set("diaPago", e.target.value)} placeholder="5" />
            </div>
            {form.periodicidad === "anual" && (
              <div className="space-y-2">
                <Label>Mes de pago *</Label>
                <Select value={form.mesPago} onValueChange={(v) => set("mesPago", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Grupo (50/30/20) *</Label>
            <Select value={form.budgetGroupId} onValueChange={(v) => set("budgetGroupId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Elige grupo" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ap-cuotafija">Cuota fija por quincena</Label>
              <Switch id="ap-cuotafija" checked={form.cuotaFija} onCheckedChange={(v) => set("cuotaFija", v)} />
            </div>
            {form.cuotaFija ? (
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.montoQuincena}
                onChange={(e) => set("montoQuincena", e.target.value)}
                className="font-mono"
                placeholder={`Sugerida: ${sugerida != null ? formatCurrency(sugerida) : "—"}`}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                {sugerida != null ? (
                  <>
                    Cuota automática: <span className="font-mono font-medium">{formatCurrency(sugerida)}</span> por
                    quincena ({formatCurrency(objetivo)} / {quincenasCiclo} quincenas).
                  </>
                ) : (
                  "Completa el monto objetivo para calcular la cuota sugerida."
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Categoría de gasto (para el pago)</Label>
            <Select value={form.categoriaId} onValueChange={(v) => set("categoriaId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Elige categoría (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {categoriasGasto.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cuenta de pago</Label>
            <Select value={form.cuentaId} onValueChange={(v) => set("cuentaId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Elige cuenta (opcional)" />
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

          <div className="col-span-2 space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={cn("size-7 rounded-full transition-transform", form.color === c && "scale-110 ring-2 ring-ring ring-offset-2")}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
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
                  onClick={() => set("icono", i)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border transition-colors",
                    form.icono === i ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <IconByName name={i} className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ap-nota">Nota</Label>
            <Textarea id="ap-nota" value={form.nota} onChange={(e) => set("nota", e.target.value)} placeholder="Detalle adicional…" rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-gradient" disabled={submitting}>
              <Save className="size-3.5 mr-1.5" />
              {submitting ? "Guardando…" : initialData ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}