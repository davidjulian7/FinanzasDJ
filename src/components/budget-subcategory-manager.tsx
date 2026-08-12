"use client";

import { useState, useCallback, useEffect } from "react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Check, X } from "lucide-react";

interface Subcategory {
  id?: number;
  nombre: string;
  icono: string;
  color: string;
  orden: number;
  activo: boolean;
  presupuesto?: number;
  expenseCategories?: Array<{ id: number; nombre: string }>;
  recurrents?: Array<{ id: number; nombre: string; monto: number }>;
}

interface BudgetSubcategoryManagerProps {
  groupId: number;
  groupKey: "necesidades" | "deseos" | "ahorro";
  groupLabel: string;
  groupColor: string;
  initialSubcategories: Subcategory[];
  onBudgetChange?: (subId: number, monto: number) => void;
  ingresosGrupo: number;
}

const ICONS = [
  "Receipt", "Tv", "ShoppingCart", "Gamepad2", "Gift", "Sparkles",
  "TrendingUp", "Shield", "Target", "Utensils", "Car", "Home",
  "HeartPulse", "Phone", "Dumbbell", "Laptop", "Plane", "GraduationCap",
  "PiggyBank", "HandCoins", "Wallet", "Tag"
];

const COLORS = [
  "#3B82F6", "#60A5FA", "#93C5FD", "#F59E0B", "#FBBF24", "#FCD34D",
  "#06D6A0", "#34D399", "#6EE7B7", "#EF4444", "#F97316", "#8B5CF6",
  "#EC4899", "#14B8A6", "#84CC16", "#A855F7", "#0EA5E9", "#6366F1",
];

export function BudgetSubcategoryManager({
  groupId,
  groupKey,
  groupLabel,
  groupColor,
  initialSubcategories,
  onBudgetChange,
  ingresosGrupo,
}: BudgetSubcategoryManagerProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>(initialSubcategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subcategory | null>(null);
  const [deleting, setDeleting] = useState<Subcategory | null>(null);

  const formData = {
    nombre: "",
    icono: "Tag",
    color: groupColor,
    orden: subcategories.length + 1,
  };

  const handleSubmit = () => {
    if (!formData.nombre.trim()) return;

    if (editing) {
      setSubcategories((prev) =>
        prev.map((s) => (s.id === editing.id ? { ...s, ...formData } : s))
      );
    } else {
      const newSub: Subcategory = {
        ...formData,
        id: Date.now(),
        activo: true,
        presupuesto: 0,
        expenseCategories: [],
        recurrents: [],
      };
      setSubcategories((prev) => [...prev, newSub]);
    }
    resetForm();
    setDialogOpen(false);
  };

  const resetForm = () => {
    Object.assign(formData, {
      nombre: "",
      icono: "Tag",
      color: groupColor,
      orden: subcategories.length + 1,
    });
    setEditing(null);
  };

  const handleEdit = (sub: Subcategory) => {
    setEditing(sub);
    Object.assign(formData, {
      nombre: sub.nombre,
      icono: sub.icono,
      color: sub.color,
      orden: sub.orden,
    });
    setDialogOpen(true);
  };

  const handleDelete = (sub: Subcategory) => {
    if (sub.id && sub.id > 0 && (sub.expenseCategories?.length || sub.recurrents?.length)) {
      setDeleting(sub);
    } else {
      setSubcategories((prev) => prev.filter((s) => s !== sub));
    }
  };

  const confirmDelete = () => {
    if (deleting) {
      setSubcategories((prev) => prev.filter((s) => s !== deleting));
      setDeleting(null);
    }
  };

  const handlePresupuestoChange = (subId: number | undefined, value: string) => {
    const num = value === "" ? 0 : Math.max(0, parseInt(value) || 0);
    setSubcategories((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, presupuesto: num } : s))
    );
    if (subId && onBudgetChange) {
      onBudgetChange(subId, num);
    }
  };

  const totalPresupuestado = subcategories.reduce((s, sc) => s + (sc.presupuesto || 0), 0);
  const disponible = ingresosGrupo - totalPresupuestado;

  useEffect(() => {
    setSubcategories(initialSubcategories);
  }, [initialSubcategories]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">Presupuestado:</span>
          <span className="font-mono font-semibold">{formatCurrency(totalPresupuestado)}</span>
        </div>
        <span className={cn("font-mono font-semibold", disponible >= 0 ? "text-positive" : "text-destructive")}>
          Disp: {formatCurrency(disponible)}
        </span>
      </div>

      {subcategories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 p-5 text-center text-sm text-muted-foreground">
          Sin subcategorías
        </div>
      ) : (
        <div className="space-y-2">
          {subcategories.map((sub, index) => (
            <div
              key={sub.id ?? index}
              className={cn(
                "group rounded-xl border p-3 transition-colors",
                sub.activo ? "border-border bg-card hover:bg-muted/30" : "border-dashed bg-muted/50 opacity-60"
              )}
            >
              <div className="flex items-center gap-2.5">
                <button
                  className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab transition-colors"
                  onClick={() => {}}
                >
                  <GripVertical className="size-4" />
                </button>
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm"
                  style={{ backgroundColor: `${sub.color}18`, color: sub.color }}
                >
                  {sub.icono[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={sub.nombre}>{sub.nombre}</p>
                  {(sub.expenseCategories?.length || 0) + (sub.recurrents?.length || 0) > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {[sub.expenseCategories?.length ? `${sub.expenseCategories.length} cats` : null, sub.recurrents?.length ? `${sub.recurrents.length} rec` : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={sub.presupuesto || 0}
                  onChange={(e) => handlePresupuestoChange(sub.id, e.target.value)}
                  className="h-8 w-24 shrink-0 font-mono text-right text-xs"
                  placeholder="0"
                />
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-sm:!opacity-100">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => handleEdit(sub)}>
                    <span className="text-xs">✏️</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => handleDelete(sub)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full border-dashed border-border/60 text-muted-foreground hover:text-foreground"
        onClick={() => { resetForm(); setDialogOpen(true); }}
      >
        <Plus className="size-3.5 mr-1.5" /> Agregar subcategoría
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar subcategoría" : "Nueva subcategoría"}</DialogTitle>
            <DialogDescription>
              Define una subcategoría dentro de {groupLabel} para organizar tu presupuesto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={formData.nombre}
                onChange={(e) => (formData.nombre = e.target.value)}
                placeholder="Ej: Gastos fijos"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Icono</label>
              <Select value={formData.icono} onValueChange={(v) => (formData.icono = v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un icono" />
                </SelectTrigger>
                <SelectContent>
                  {ICONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <Select value={formData.color} onValueChange={(v) => (formData.color = v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un color" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <span className="size-4 rounded" style={{ backgroundColor: color }} />
                        {color}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Orden</label>
              <Input
                type="number"
                min={1}
                value={formData.orden}
                onChange={(e) => (formData.orden = parseInt(e.target.value) || 1)}
                className="w-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent className="glass sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar subcategoría</DialogTitle>
            <DialogDescription>
              {`¿Seguro que quieres eliminar "${deleting?.nombre}"? ${deleting?.expenseCategories?.length || deleting?.recurrents?.length ? 'Tiene categorías o gastos recurrentes asociados, se desactivará en lugar de eliminarse.' : 'Esta acción no se puede deshacer.'}`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {deleting?.expenseCategories?.length || deleting?.recurrents?.length ? "Desactivar" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}