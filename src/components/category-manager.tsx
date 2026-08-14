"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useReference } from "@/stores/reference";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { IconByName, ICON_NAMES } from "@/components/icon-registry";
import { cn } from "@/lib/utils";
import type { ExpenseCategoryRow } from "@/lib/types";

const COLORES = ["#2D3748", "#4A5568", "#5A8F6D", "#C9A24A", "#B86A62", "#8C94A3", "#7D9C88", "#D2B56C", "#C98A7E", "#A3B79A"];

interface GrupoRow {
  id: number;
  key: string;
  label: string;
  color: string;
}

export function CategoryManager() {
  const { expenseCategories, reload } = useReference();

  const [tipo, setTipo] = useState<"gasto" | "ingreso">("gasto");
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#2D3748");
  const [icono, setIcono] = useState("Tag");
  const [grupo, setGrupo] = useState("");
  const [grupos, setGrupos] = useState<GrupoRow[]>([]);
  const [creando, setCreando] = useState(false);

  const [editando, setEditando] = useState<ExpenseCategoryRow | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIcono, setEditIcono] = useState("");
  const [editGrupo, setEditGrupo] = useState("");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  useEffect(() => {
    api
      .get<GrupoRow[]>("/api/budget-groups")
      .then(setGrupos)
      .catch(() => {
        /* opcional: sin grupos disponibles */
      });
  }, []);

  const gastos = expenseCategories.filter((c) => c.tipo === "gasto");
  const ingresos = expenseCategories.filter((c) => c.tipo === "ingreso");

  async function crearCategoria() {
    if (!nombre.trim()) return toast.error("Escribe el nombre de la categoría");
    setCreando(true);
    try {
      await api.post("/api/expense-categories", {
        nombre: nombre.trim(),
        tipo,
        color,
        icono,
        budgetGroupId: tipo === "gasto" && grupo ? Number(grupo) : null,
      });
      toast.success("Categoría creada");
      setNombre("");
      setColor("#2D3748");
      setIcono("Tag");
      setGrupo("");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear la categoría");
    } finally {
      setCreando(false);
    }
  }

  function abrirEdicion(c: ExpenseCategoryRow) {
    setEditando(c);
    setEditNombre(c.nombre);
    setEditColor(c.color);
    setEditIcono(c.icono);
    setEditGrupo(c.budgetGroupId ? String(c.budgetGroupId) : "");
  }

  async function guardarEdicion() {
    if (!editando) return;
    if (!editNombre.trim()) return toast.error("Escribe el nombre de la categoría");
    setGuardandoEdit(true);
    try {
      await api.patch(`/api/expense-categories/${editando.id}`, {
        nombre: editNombre.trim(),
        color: editColor,
        icono: editIcono,
        budgetGroupId: editando.tipo === "gasto" && editGrupo ? Number(editGrupo) : null,
      });
      toast.success("Categoría actualizada");
      setEditando(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la categoría");
    } finally {
      setGuardandoEdit(false);
    }
  }

  async function eliminarCategoria(c: ExpenseCategoryRow) {
    if (
      !window.confirm(
        `¿Eliminar la categoría "${c.nombre}"? Los movimientos ya registrados la conservan, pero ya no podrás usarla para registros nuevos.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/api/expense-categories/${c.id}`);
      toast.success("Categoría eliminada");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar la categoría");
    }
  }

  function ListaCategorias({ items }: { items: typeof gastos }) {
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground">Todavía no tienes categorías de este tipo.</p>;
    }
    return (
      <ul className="flex flex-wrap gap-2">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-1.5 rounded-full border bg-muted/40 py-1 pl-1.5 pr-1.5 text-sm"
            style={{ borderColor: `${c.color}55` }}
          >
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: c.color }}
            >
              <IconByName name={c.icono} className="size-3.5" />
            </span>
            <span className="max-w-44 truncate">{c.nombre}</span>
            {c.budgetGroup && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: c.budgetGroup.color }}
              >
                {c.budgetGroup.label}
              </span>
            )}
            <button
              type="button"
              onClick={() => abrirEdicion(c)}
              title={`Editar ${c.nombre}`}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => eliminarCategoria(c)}
              title={`Eliminar ${c.nombre}`}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="size-4 text-primary" /> Categorías
        </CardTitle>
        <CardDescription>
          Crea, edita o elimina tus categorías de gasto e ingreso. Las predeterminadas ya están listas para usar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Gastos ({gastos.length})</Label>
            <ListaCategorias items={gastos} />
          </div>
          <div className="space-y-2">
            <Label>Ingresos ({ingresos.length})</Label>
            <ListaCategorias items={ingresos} />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
          <p className="text-sm font-medium">Nueva categoría</p>
          <Tabs value={tipo} onValueChange={(v) => setTipo(v as "gasto" | "ingreso")}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="gasto" className="flex-1 sm:flex-none">
                Gasto
              </TabsTrigger>
              <TabsTrigger value="ingreso" className="flex-1 sm:flex-none">
                Ingreso
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-nombre">Nombre</Label>
              <Input
                id="cat-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Mascotas, Renta, Regalos..."
              />
            </div>
            {tipo === "gasto" && (
              <div className="space-y-1.5">
                <Label>Grupo 50/30/20 (opcional)</Label>
                <Select value={grupo} onValueChange={setGrupo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sin grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                          {g.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("size-6 rounded-full", color === c && "ring-2 ring-ring ring-offset-1")}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Icono</Label>
            <Select value={icono} onValueChange={setIcono}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ICON_NAMES.map((i) => (
                  <SelectItem key={i} value={i}>
                    <span className="flex items-center gap-2">
                      <IconByName name={i} className="size-4" /> {i}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="btn-gradient gap-1.5" disabled={creando || !nombre.trim()} onClick={crearCategoria}>
            <Plus className="size-4" /> {creando ? "Creando…" : "Crear categoría"}
          </Button>
        </div>
      </CardContent>

      <Dialog open={editando != null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="glass sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
            <DialogDescription>Cambia el nombre, el color, el icono o el grupo de presupuesto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input id="edit-nombre" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
            </div>
            {editando?.tipo === "gasto" && (
              <div className="space-y-1.5">
                <Label>Grupo 50/30/20 (opcional)</Label>
                <Select value={editGrupo} onValueChange={setEditGrupo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sin grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        <span className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                          {g.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={cn("size-6 rounded-full", editColor === c && "ring-2 ring-ring ring-offset-1")}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Icono</Label>
              <Select value={editIcono} onValueChange={setEditIcono}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_NAMES.map((i) => (
                    <SelectItem key={i} value={i}>
                      <span className="flex items-center gap-2">
                        <IconByName name={i} className="size-4" /> {i}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={guardandoEdit}>
              Cancelar
            </Button>
            <Button className="btn-gradient gap-1.5" onClick={guardarEdicion} disabled={guardandoEdit || !editNombre.trim()}>
              <Pencil className="size-4" /> {guardandoEdit ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}