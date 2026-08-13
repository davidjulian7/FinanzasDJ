"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { formatShortDate, todayISO } from "@/lib/format";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Calendar, X, Save } from "lucide-react";

interface RecurringExpenseFormData {
  nombre: string;
  monto: number;
  frecuencia: "semanal" | "quincenal" | "mensual" | "anual";
  proximoCobro: string;
  expenseCategoryId: number;
  accountId: number;
  budgetGroupId: number;
  nota: string;
  activo: boolean;
}

interface RecurringExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: {
    id: number;
    nombre: string;
    monto: number;
    frecuencia: "semanal" | "quincenal" | "mensual" | "anual";
    proximoCobro: string;
    expenseCategoryId: number;
    accountId: number;
    budgetGroupId: number;
    nota: string | null;
    activo: boolean;
    expenseCategory?: { id: number; nombre: string; [key: string]: unknown } | null;
    account?: { id: number; nombre: string; [key: string]: unknown } | null;
    budgetGroup?: { id: number; label: string; [key: string]: unknown } | null;
  } | null;
  onSaved: () => void;
}

const FRECUENCIAS = [
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
  { value: "anual", label: "Anual" },
] as const;

export function RecurringExpenseForm({ open, onOpenChange, initialData, onSaved }: RecurringExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: number; nombre: string; budgetGroupId: number | null; budgetGroup?: { id: number; label: string } | null }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: number; nombre: string; tipo: string }>>([]);
  const [groups, setGroups] = useState<Array<{ id: number; key: string; label: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<RecurringExpenseFormData>({
    nombre: "",
    monto: 0,
    frecuencia: "mensual",
    proximoCobro: todayISO(),
    expenseCategoryId: 0,
    accountId: 0,
    budgetGroupId: 0,
    nota: "",
    activo: true,
  });

  const fetchRefs = useCallback(async () => {
    try {
      const [cats, accs, grps] = await Promise.all([
        api.get<Array<{ id: number; nombre: string; budgetGroupId: number | null; budgetGroup?: { id: number; label: string } | null }>>("/api/expense-categories"),
        api.get<Array<{ id: number; nombre: string; tipo: string }>>("/api/accounts"),
        api.get<Array<{ id: number; key: string; label: string }>>("/api/budget-groups"),
      ]);
      setCategories(cats);
      setAccounts(accs);
      setGroups(grps);
    } catch {
      toast.error("No se pudieron cargar las referencias");
    }
  }, []);

  useEffect(() => {
    fetchRefs();
  }, [fetchRefs]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre: initialData.nombre,
        monto: initialData.monto,
        frecuencia: initialData.frecuencia,
        proximoCobro: initialData.proximoCobro,
        expenseCategoryId: initialData.expenseCategoryId,
        accountId: initialData.accountId,
        budgetGroupId: initialData.budgetGroupId,
        nota: initialData.nota || "",
        activo: initialData.activo,
      });
    } else {
      setFormData({
        nombre: "",
        monto: 0,
        frecuencia: "mensual",
    proximoCobro: todayISO(),
        expenseCategoryId: 0,
        accountId: 0,
        budgetGroupId: 0,
        nota: "",
        activo: true,
      });
    }
  }, [initialData, open]);

  const handleSubmit = async () => {
    if (!formData.nombre.trim() || !formData.monto || !formData.expenseCategoryId || !formData.accountId || !formData.budgetGroupId || !formData.proximoCobro) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    setSubmitting(true);
    try {
      if (initialData) {
        await api.patch(`/api/recurring-expenses/${initialData.id}`, formData);
      } else {
        await api.post("/api/recurring-expenses", formData);
      }
      toast.success(initialData ? "Actualizado" : "Creado");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof RecurringExpenseFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar gasto recurrente" : "Nuevo gasto recurrente"}</DialogTitle>
          <DialogDescription>
            Define un pago periódico para recordatorios y proyecciones. No genera movimientos automáticos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
              placeholder="Ej: Alquiler, Netflix, Gimnasio"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto">Monto *</Label>
            <Input
              id="monto"
              type="number"
              min={0}
              step={0.01}
              value={formData.monto}
              onChange={(e) => handleChange("monto", parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="font-mono text-right"
            />
          </div>

          <div className="space-y-2">
            <Label>Frecuencia *</Label>
            <Select value={formData.frecuencia} onValueChange={(v) => handleChange("frecuencia", v as "semanal" | "quincenal" | "mensual" | "anual")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona frecuencia" />
              </SelectTrigger>
              <SelectContent>
                {FRECUENCIAS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proximoCobro">Próximo cobro *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="proximoCobro"
                type="date"
                value={formData.proximoCobro}
                onChange={(e) => handleChange("proximoCobro", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoría de gasto *</Label>
            <Select value={String(formData.expenseCategoryId)} onValueChange={(v) => handleChange("expenseCategoryId", Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cuenta de pago *</Label>
            <Select value={String(formData.accountId)} onValueChange={(v) => handleChange("accountId", Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.nombre} ({a.tipo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Grupo de presupuesto *</Label>
            <Select value={String(formData.budgetGroupId)} onValueChange={(v) => handleChange("budgetGroupId", Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona grupo" />
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
            <Label htmlFor="nota">Nota</Label>
            <Textarea
              id="nota"
              value={formData.nota}
              onChange={(e) => handleChange("nota", e.target.value)}
              placeholder="Detalles adicionales..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="activo">Activo</Label>
            <Switch
              id="activo"
              checked={formData.activo}
              onCheckedChange={(v) => handleChange("activo", v)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Save className="size-3.5 mr-1.5" />
            {submitting ? "Guardando…" : initialData ? "Actualizar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}