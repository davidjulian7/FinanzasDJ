"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ToggleLeft, ToggleRight, Edit, Calendar, CreditCard, Tag, CircleDollarSign } from "lucide-react";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RecurringExpenseForm } from "@/components/recurring-expense-form";

interface RecurringExpense {
  id: number;
  nombre: string;
  monto: number;
  frecuencia: "semanal" | "quincenal" | "mensual" | "anual";
  proximoCobro: string;
  expenseCategoryId: number;
  accountId: number;
  budgetGroupId: number;
  expenseCategory: { id: number; nombre: string; icono: string; color: string; budgetGroupId: number | null } | null;
  account: { id: number; nombre: string; tipo: string; color: string; icono: string } | null;
  budgetGroup: { id: number; key: string; label: string; color: string; icono: string; orden: number } | null;
  nota: string | null;
  activo: boolean;
}

const FRECUENCIA_LABELS: Record<string, string> = {
  semanal: "Semanal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  anual: "Anual",
};

export default function RecurringExpensesPage() {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<RecurringExpense[]>(`/api/recurring-expenses?activo=${showInactive ? "false" : "true"}`);
      setItems(data);
    } catch {
      toast.error("No se pudieron cargar los gastos recurrentes");
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleToggle = async (item: RecurringExpense) => {
    const prevActivo = item.activo;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, activo: !i.activo } : i)));
    try {
      await api.post(`/api/recurring-expenses/${item.id}/toggle`);
      toast.success(prevActivo ? "Desactivado" : "Activado");
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, activo: prevActivo } : i)));
      toast.error("No se pudo cambiar el estado");
    }
  };

  const handleDelete = async (item: RecurringExpense) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== item.id));
    try {
      await api.delete(`/api/recurring-expenses/${item.id}`);
      toast.success("Eliminado");
    } catch {
      setItems(prev);
      toast.error("No se pudo eliminar");
    }
  };

  const handleSave = () => {
    setFormOpen(false);
    setEditing(null);
    cargar();
  };

  const activeItems = items.filter((i) => i.activo);
  const inactiveItems = items.filter((i) => !i.activo);

  const totalMensualActivos = activeItems.reduce((sum, i) => {
    const mult = i.frecuencia === "semanal" ? 4.33 : i.frecuencia === "quincenal" ? 2 : i.frecuencia === "mensual" ? 1 : 1/12;
    return sum + i.monto * mult;
  }, 0);

  const totalPorGrupo = activeItems.reduce((acc, i) => {
    const key = i.budgetGroup?.key || "necesidades";
    acc[key] = (acc[key] || 0) + i.monto;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Gastos recurrentes</h1>
          <Badge variant={showInactive ? "default" : "outline"} onClick={() => setShowInactive(!showInactive)} className="cursor-pointer">
            {showInactive ? "Ocultar inactivos" : "Ver inactivos"}
          </Badge>
        </div>
        <Button className="btn-gradient gap-1.5" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="size-4" /> Nuevo
        </Button>
      </div>

      <div className="glass glow-hover rounded-2xl border border-border p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="font-mono text-2xl font-bold">{activeItems.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Estimado mensual</p>
            <p className="font-mono text-xl font-bold">{formatCurrency(totalMensualActivos)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Necesidades</p>
            <p className="font-mono text-lg font-bold text-blue-500">{formatCurrency(totalPorGrupo.necesidades || 0)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Deseos / Ahorro</p>
            <p className="font-mono text-lg font-bold text-amber-500">{formatCurrency((totalPorGrupo.deseos || 0) + (totalPorGrupo.ahorro || 0))}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-border animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : activeItems.length === 0 && inactiveItems.length === 0 ? (
        <div className="glass rounded-2xl border border-border py-12 text-center text-sm text-muted-foreground">
          {showInactive ? "No hay gastos recurrentes" : "No hay gastos recurrentes activos"}
        </div>
      ) : (
        <>
          {activeItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Activos ({activeItems.length})</h3>
              <div className="divide-y divide-border/60">
                {activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${item.expenseCategory?.color || "#2D3748"}22`, color: item.expenseCategory?.color || "#2D3748" }}
                      >
                        <Tag className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.nombre}</p>
                        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1">
                            <CircleDollarSign className="size-3" />
                            {formatCurrency(item.monto)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {FRECUENCIA_LABELS[item.frecuencia]}
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="size-3" />
                            {item.account?.nombre}
                          </span>
                          {item.budgetGroup && (
                            <Badge variant="secondary" className="gap-1" style={{ backgroundColor: `${item.budgetGroup.color}20`, color: item.budgetGroup.color }}>
                              {item.budgetGroup.label}
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Próx: {formatShortDate(item.proximoCobro)}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditing(item); setFormOpen(true); }}>
                        <Edit className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => handleToggle(item)}>
                        {item.activo ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => handleDelete(item)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inactiveItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Inactivos ({inactiveItems.length})</h3>
              <div className="divide-y divide-border/60">
                {inactiveItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 py-3 opacity-60 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"
                      >
                        <Tag className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.nombre}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.monto)} · {FRECUENCIA_LABELS[item.frecuencia]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditing(item); setFormOpen(true); }}>
                        <Edit className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => handleToggle(item)}>
                        <ToggleLeft className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => handleDelete(item)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <RecurringExpenseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editing}
        onSaved={handleSave}
      />
    </div>
  );
}