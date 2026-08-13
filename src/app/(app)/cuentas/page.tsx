"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { AccountRow } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { AccountCard } from "@/components/account-card";
import { AccountModal } from "@/components/account-modal";
import { useReferenceStore } from "@/stores/reference";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SECCIONES: Array<{ titulo: string; tipos: string[] }> = [
  { titulo: "Cuentas de débito", tipos: ["debito"] },
  { titulo: "Tarjetas de crédito", tipos: ["credito"] },
  { titulo: "Efectivo", tipos: ["efectivo"] },
  { titulo: "Inversiones", tipos: ["inversion"] },
];

export default function AccountsPage() {
  const [cuentas, setCuentas] = useState<AccountRow[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<AccountRow | null>(null);
  const [eliminando, setEliminando] = useState<AccountRow | null>(null);
  const [refresh, setRefresh] = useState(0);

  const cargar = useCallback(async () => {
    try {
      setCuentas(await api.get<AccountRow[]>("/api/accounts"));
    } catch {
      toast.error("No se pudieron cargar las cuentas");
      setCuentas([]);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar, refresh]);

  async function eliminar() {
    if (!eliminando) return;
    try {
      await api.delete(`/api/accounts/${eliminando.id}`);
      toast.success("Cuenta eliminada");
      setEliminando(null);
      setRefresh((r) => r + 1);
      useReferenceStore.getState().load(true).catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  const totales = (tipos: string[]) =>
    (cuentas ?? []).filter((c) => tipos.includes(c.tipo)).reduce((s, c) => s + c.saldoActual, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {cuentas ? `${cuentas.length} cuentas · Patrimonio ${formatCurrency(totales(["debito", "efectivo", "inversion"]))}` : "Cargando…"}
        </p>
        <Button className="btn-gradient gap-1.5" onClick={() => { setEditando(null); setModalOpen(true); }}>
          <Plus className="size-4" /> Agregar cuenta
        </Button>
      </div>

      {cuentas === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        SECCIONES.map(
          (sec) =>
            (cuentas ?? []).some((c) => sec.tipos.includes(c.tipo)) && (
              <section key={sec.titulo}>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{sec.titulo}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {(cuentas ?? [])
                    .filter((c) => sec.tipos.includes(c.tipo))
                    .sort((a, b) => b.saldoActual - a.saldoActual)
                    .map((c) => (
                      <AccountCard
                        key={c.id}
                        cuenta={c}
                        onEdit={(cuenta) => {
                          setEditando(cuenta);
                          setModalOpen(true);
                        }}
                        onDelete={setEliminando}
                      />
                    ))}
                </div>
              </section>
            )
        )
      )}

      <AccountModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditando(null);
        }}
        cuenta={editando}
        onSaved={() => {
          setRefresh((r) => r + 1);
          useReferenceStore.getState().load(true).catch(() => {});
        }}
      />

      <Dialog open={!!eliminando} onOpenChange={(v) => !v && setEliminando(null)}>
        <DialogContent className="glass sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar cuenta</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar “{eliminando?.nombre}”? Si tiene movimientos asociados no se podrá eliminar.
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
