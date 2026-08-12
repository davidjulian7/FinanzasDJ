"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useRangeDates } from "@/stores/range";
import { useReference } from "@/stores/reference";
import { api } from "@/lib/api";
import type { TxRow, TxTipo } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { DateRangePicker } from "@/components/date-range-picker";
import { TransactionRow } from "@/components/transaction-row";
import { TransactionModal } from "@/components/transaction-modal";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsPage() {
  const range = useRangeDates();
  const { accounts: cuentas, expenseCategories: categorias } = useReference();
  const [rows, setRows] = useState<TxRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [accountId, setAccountId] = useState("all");
  const [categoriaId, setCategoriaId] = useState("all");
  const [tipo, setTipo] = useState("all");
  const [busqueda, setBusqueda] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<TxRow | null>(null);
  const [eliminando, setEliminando] = useState<TxRow | null>(null);
  const [refresh, setRefresh] = useState(0);

  const cargar = useCallback(async () => {
    setRefreshing(true);
    const params = new URLSearchParams();
    params.set("from", range.from);
    params.set("to", range.to);
    if (accountId && accountId !== "all") params.set("account", accountId);
    if (categoriaId && categoriaId !== "all") params.set("categoria", categoriaId);
    if (tipo && tipo !== "all") params.set("tipo", tipo);
    try {
      const txs = await api.get<TxRow[]>(`/api/transactions?${params.toString()}`);
      setRows(txs);
    } catch {
      toast.error("No se pudieron cargar las transacciones");
      setRows((prev) => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [range.from, range.to, accountId, categoriaId, tipo]);

  useEffect(() => {
    cargar();
  }, [cargar, refresh]);

  const filtradas = useMemo(() => {
    if (!rows) return rows;
    const q = busqueda.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => t.descripcion.toLowerCase().includes(q) || (t.notas ?? "").toLowerCase().includes(q));
  }, [rows, busqueda]);

  async function eliminar() {
    if (!eliminando) return;
    const prev = rows;
    setRows((r) => (r ? r.filter((t) => t.id !== eliminando.id) : r));
    setEliminando(null);
    try {
      await api.delete(`/api/transactions/${eliminando.id}`);
      toast.success("Movimiento eliminado");
      setRefresh((r) => r + 1);
    } catch (e) {
      setRows(prev);
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  function onSaved(row?: TxRow) {
    if (row) {
      setRows((prev) => {
        if (!prev) return prev;
        const existe = prev.some((t) => t.id === row.id);
        return existe ? prev.map((t) => (t.id === row.id ? row : t)) : [row, ...prev];
      });
    }
    setRefresh((r) => r + 1);
  }

  function exportarCSV() {
    if (!filtradas || !filtradas.length) {
      toast.error("No hay transacciones para exportar");
      return;
    }
    const enc = ["Fecha", "Tipo", "Descripcion", "Categoria", "Cuenta", "Cuenta destino", "Monto", "Notas"];
    const lineas = filtradas.map((t) =>
      [
        t.fecha,
        t.tipo,
        `"${t.descripcion.replace(/"/g, '""')}"`,
        t.categoria ? `"${t.categoria.replace(/"/g, '""')}"` : "",
        `"${t.cuenta.replace(/"/g, '""')}"`,
        t.cuentaDestino ? `"${t.cuentaDestino.replace(/"/g, '""')}"` : "",
        t.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 }),
        t.notas ? `"${t.notas.replace(/"/g, '""')}"` : "",
      ].join(";")
    );
    const csv = "\uFEFF" + [enc.join(";"), ...lineas].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacciones_${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <DateRangePicker />
          {refreshing && rows !== null && (
            <span className="text-xs text-muted-foreground">Actualizando…</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar…" className="h-9 w-40 pl-8 text-sm" />
          </div>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="Cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las cuentas</SelectItem>
              {cuentas.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="gasto">Gastos</SelectItem>
              <SelectItem value="ingreso">Ingresos</SelectItem>
              <SelectItem value="transferencia">Transferencias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportarCSV}>
            <Download className="size-4" /> CSV
          </Button>
          <Button size="sm" className="btn-gradient h-9 gap-1.5" onClick={() => { setEditando(null); setModalOpen(true); }}>
            <Plus className="size-4" /> Nuevo
          </Button>
        </div>
      </div>

      {rows === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtradas && filtradas.length > 0 ? (
        <>
          <div className="glass hidden rounded-2xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[220px]">Descripción</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((t) => (
                  <TableRow key={t.id} className="group">
                    <TableCell>
                      <p className="font-medium">{t.descripcion}</p>
                      <p className="text-xs text-muted-foreground">{t.fecha}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.tipo === "transferencia" ? `${t.cuenta} → ${t.cuentaDestino}` : t.cuenta}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.categoria ?? "—"}</TableCell>
                    <TableCell>
                      <TipoBadge tipo={t.tipo} />
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${t.tipo === "ingreso" ? "text-positive" : t.tipo === "gasto" ? "text-destructive" : "text-info"}`}>
                      {t.tipo === "ingreso" ? "+" : t.tipo === "gasto" ? "−" : "↔ "}
                      {formatCurrency(t.monto)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => { setEditando(t); setModalOpen(true); }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setEliminando(t)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="glass divide-y divide-border/60 rounded-2xl border border-border p-2 md:hidden">
            {filtradas.map((t) => (
              <TransactionRow key={t.id} tx={t} showActions onEdit={(x) => { setEditando(x); setModalOpen(true); }} onDelete={setEliminando} />
            ))}
          </div>
        </>
      ) : (
        <div className="glass rounded-2xl border border-border py-16 text-center text-sm text-muted-foreground">
          No hay transacciones en este período
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        tx={editando}
        onSaved={onSaved}
      />

      <Dialog open={!!eliminando} onOpenChange={(v) => !v && setEliminando(null)}>
        <DialogContent className="glass sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar movimiento</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar “{eliminando?.descripcion}” por {eliminando ? formatCurrency(eliminando.monto) : ""}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEliminando(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={eliminar}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: TxTipo }) {
  const map: Record<TxTipo, { label: string; cls: string }> = {
    gasto: { label: "Gasto", cls: "bg-destructive/15 text-destructive" },
    ingreso: { label: "Ingreso", cls: "bg-positive/15 text-positive" },
    transferencia: { label: "Transferencia", cls: "bg-info/15 text-info" },
  };
  const m = map[tipo];
  return <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}
