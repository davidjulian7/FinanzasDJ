"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReference } from "@/stores/reference";
import { api } from "@/lib/api";
import type { TxRow, TxTipo, ApartadoRow } from "@/lib/types";
import { formatCurrency, todayISO } from "@/lib/format";

export function TransactionModal({
  open,
  onOpenChange,
  tx,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tx?: TxRow | null;
  onSaved?: (row?: TxRow) => void;
}) {
  const { accounts: cuentas, expenseCategories: categorias } = useReference();
  const [loading, setLoading] = useState(false);

  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState<TxTipo>(tx?.tipo ?? "gasto");
  const [accountId, setAccountId] = useState("");
  const [accountDestinoId, setAccountDestinoId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [notas, setNotas] = useState("");
  const [apartados, setApartados] = useState<ApartadoRow[]>([]);
  const [apartadoId, setApartadoId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setDescripcion(tx?.descripcion ?? "");
    setMonto(tx ? String(tx.monto) : "");
    setTipo(tx?.tipo ?? "gasto");
    setAccountId(tx ? String(tx.accountId) : "");
    setAccountDestinoId(tx?.accountDestinoId ? String(tx.accountDestinoId) : "");
    setCategoryId(tx?.categoryId ? String(tx.categoryId) : "");
    setFecha(tx?.fecha ?? todayISO());
    setNotas(tx?.notas ?? "");
    setApartadoId(tx?.apartadoId ?? null);
    if (!tx) {
      api
        .get<ApartadoRow[]>("/api/apartados")
        .then((list) => setApartados(list.filter((a) => a.activo)))
        .catch(() => {
          /* opcional */
        });
    }
  }, [open, tx]);

  const apartadoDeCategoria = useMemo(() => {
    if (!categoryId || tipo === "transferencia" || tipo === "ingreso") return null;
    return apartados.find((a) => a.categoriaId === Number(categoryId)) ?? null;
  }, [apartados, categoryId, tipo]);

  const categoriasFiltradas = useMemo(
    () => categorias.filter((c) => c.tipo === (tipo === "ingreso" ? "ingreso" : "gasto")),
    [categorias, tipo]
  );

  const categoriaElegida = useMemo(
    () => categoriasFiltradas.find((c) => c.id === Number(categoryId)),
    [categoriasFiltradas, categoryId]
  );

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) return toast.error("Escribí una descripción");
    const m = Number(monto);
    if (!Number.isFinite(m) || m <= 0) return toast.error("El monto debe ser mayor a cero");
    if (!accountId) return toast.error("Seleccioná una cuenta");
    if (tipo === "transferencia" && !accountDestinoId) return toast.error("Seleccioná la cuenta destino");
    if (tipo !== "transferencia" && !categoryId) return toast.error("Seleccioná una categoría");

    const body = {
      descripcion,
      monto: m,
      tipo,
      accountId: Number(accountId),
      accountDestinoId: tipo === "transferencia" ? Number(accountDestinoId) : null,
      categoryId: tipo === "transferencia" ? null : Number(categoryId),
      apartadoId: tipo === "gasto" && apartadoId != null ? apartadoId : null,
      fecha,
      notas: notas || null,
    };

    setLoading(true);
    try {
      const res = tx
        ? await api.put<{ id: number }>(`/api/transactions/${tx.id}`, body)
        : await api.post<{ id: number }>("/api/transactions", body);
      const id = res?.id ?? tx?.id ?? 0;
      const cuentaNombre = cuentas.find((c) => c.id === Number(accountId))?.nombre ?? "—";
      const cuentaDestino = tipo === "transferencia" ? (cuentas.find((c) => c.id === Number(accountDestinoId))?.nombre ?? "—") : null;
      const cat = tipo === "transferencia" ? undefined : categorias.find((c) => c.id === Number(categoryId));
      const apElegido = apartados.find((x) => x.id === apartadoId);
      onSaved?.({
        id,
        descripcion,
        monto: m,
        tipo,
        fecha,
        notas: notas || null,
        accountId: Number(accountId),
        accountDestinoId: tipo === "transferencia" ? Number(accountDestinoId) : null,
        categoryId: tipo === "transferencia" ? null : Number(categoryId),
        apartadoId: tipo === "gasto" && apartadoId != null ? apartadoId : null,
        cuenta: cuentaNombre,
        cuentaDestino,
        categoria: cat?.nombre ?? null,
        icono: cat?.icono ?? null,
        color: cat?.color ?? null,
        budgetGroupKey: cat?.budgetGroup?.key ?? null,
        apartado: apElegido?.nombre ?? null,
      });
      toast.success(tx ? "Transacción actualizada" : "Movimiento registrado");
      onOpenChange(false);
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
          <DialogTitle>{tx ? "Editar movimiento" : "Registrar movimiento"}</DialogTitle>
          <DialogDescription>Ingresá los datos del movimiento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="space-y-4 py-2">
          <Tabs value={tipo} onValueChange={(v) => setTipo(v as TxTipo)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gasto" className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">
                Gasto
              </TabsTrigger>
              <TabsTrigger value="ingreso" className="data-[state=active]:bg-positive/20 data-[state=active]:text-positive">
                Ingreso
              </TabsTrigger>
              <TabsTrigger value="transferencia" className="data-[state=active]:bg-info/20 data-[state=active]:text-info">
                Transferencia
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="tx-descripcion">Descripción</Label>
              <Input id="tx-descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: Supermercado" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-monto">Monto</Label>
              <Input id="tx-monto" type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-fecha">Fecha</Label>
              <Input id="tx-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-cuenta">{tipo === "transferencia" ? "Cuenta origen" : "Cuenta"}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="tx-cuenta">
                  <SelectValue placeholder="Elegí una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cuentas.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tipo === "transferencia" ? (
              <div className="space-y-2">
                <Label htmlFor="tx-destino">Cuenta destino</Label>
                <Select value={accountDestinoId} onValueChange={setAccountDestinoId}>
                  <SelectTrigger id="tx-destino">
                    <SelectValue placeholder="Elegí la cuenta destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentas
                      .filter((c) => String(c.id) !== accountId)
                      .map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="tx-categoria">Categoría</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="tx-categoria">
                    <SelectValue placeholder="Elegí una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasFiltradas.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: c.budgetGroup?.color ?? "#6B6B85" }}
                          />
                          {c.nombre}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categoriaElegida && !categoriaElegida.budgetGroup && tipo !== "ingreso" && (
                  <p className="text-[11px] text-muted-foreground">
                    Esta categoría no está asignada a un grupo de presupuesto: el gasto no contará en la 50/30/20.
                  </p>
                )}
                {apartadoDeCategoria && !tx && (
                  <label
                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={apartadoId === apartadoDeCategoria.id}
                      onChange={(e) => setApartadoId(e.target.checked ? apartadoDeCategoria.id : null)}
                      className="mt-0.5"
                    />
                    <span>
                      Pagar desde el apartado{" "}
                      <span className="font-medium" style={{ color: apartadoDeCategoria.color }}>
                        {apartadoDeCategoria.nombre}
                      </span>{" "}
                      ({formatCurrency(apartadoDeCategoria.juntado)} juntados de {formatCurrency(apartadoDeCategoria.montoObjetivo)}).
                      Así el gasto no vuelve a contar en el presupuesto.
                    </span>
                  </label>
                )}
              </div>
            )}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="tx-notas">Notas (opcional)</Label>
              <Textarea id="tx-notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Detalle adicional…" className="min-h-16 resize-none" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-gradient" disabled={loading}>
              {loading ? "Guardando…" : tx ? "Guardar cambios" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}