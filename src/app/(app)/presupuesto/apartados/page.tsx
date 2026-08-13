"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ApartadoCard } from "@/components/apartado-card";
import { ApartadoForm } from "@/components/apartado-form";
import { ApartadoPagoModal } from "@/components/apartado-pago-modal";
import type { ApartadoRow } from "@/lib/types";

export default function ApartadosPage() {
  const [apartados, setApartados] = useState<ApartadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApartadoRow | null>(null);
  const [paying, setPaying] = useState<ApartadoRow | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setApartados(await api.get<ApartadoRow[]>("/api/apartados"));
    } catch {
      toast.error("No se pudieron cargar los apartados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const activos = apartados.filter((a) => a.activo);
  const inactivos = apartados.filter((a) => !a.activo);

  const totales = useMemo(() => {
    const cuotaQuincena = activos.reduce((s, a) => s + a.cuotaEfectiva, 0);
    const juntado = activos.reduce((s, a) => s + a.juntado, 0);
    const listos = activos.filter((a) => a.estado === "listo").length;
    const atrasados = activos.filter((a) => a.estado === "atrasado").length;
    return { cuotaQuincena, juntado, listos, atrasados };
  }, [activos]);

  async function apartar(a: ApartadoRow) {
    setBusyId(a.id);
    try {
      await api.post("/api/apartados/contribuciones", {
        apartadoId: a.id,
        anio: a.apartadoQuincena.anio,
        mes: a.apartadoQuincena.mes,
        quincena: a.apartadoQuincena.quincena,
      });
      toast.success(`Apartado ${formatCurrency(a.cuotaEfectiva)} para ${a.nombre}`);
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo apartar");
    } finally {
      setBusyId(null);
    }
  }

  async function toggle(a: ApartadoRow) {
    setBusyId(a.id);
    try {
      await api.patch(`/api/apartados/${a.id}`, { activo: !a.activo });
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setBusyId(null);
    }
  }

  async function eliminar(a: ApartadoRow) {
    if (!window.confirm(`¿Eliminar el apartado "${a.nombre}"? Sus contribuciones se borrarán; los pagos ya registrados se conservan.`)) return;
    setBusyId(a.id);
    try {
      await api.delete(`/api/apartados/${a.id}`);
      toast.success("Apartado eliminado");
      cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    } finally {
      setBusyId(null);
    }
  }

  const Card = ({ a }: { a: ApartadoRow }) => (
    <ApartadoCard
      apartado={a}
      busy={busyId === a.id}
      onApartar={apartar}
      onPagar={setPaying}
      onEdit={(x) => {
        setEditing(x);
        setFormOpen(true);
      }}
      onToggle={toggle}
      onDelete={eliminar}
    />
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl border border-border animate-pulse bg-muted/50" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-48 rounded-2xl border border-border animate-pulse bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Apartados</h1>
          <p className="text-sm text-muted-foreground">
            Reservas quincenales hacia pagos futuros. Apartan del presupuesto sin mover dinero.
          </p>
        </div>
        <Button className="btn-gradient gap-1.5" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="size-4" /> Nuevo apartado
        </Button>
      </div>

      <div className="glass glow-hover rounded-2xl border border-border p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Apartando por quincena</p>
            <p className="font-mono text-xl font-bold">{formatCurrency(totales.cuotaQuincena)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Juntado total</p>
            <p className="font-mono text-xl font-bold">{formatCurrency(totales.juntado)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Listos para pagar</p>
            <p className="font-mono text-xl font-bold text-positive">{totales.listos}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Atrasados</p>
            <p className="font-mono text-xl font-bold text-destructive">{totales.atrasados}</p>
          </div>
        </div>
      </div>

      {apartados.length === 0 ? (
        <div className="glass rounded-2xl border border-border py-14 text-center text-sm text-muted-foreground">
          No hay apartados todavía. Creá uno para empezar a reservar hacia tu próximo pago.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activos.map((a) => (
            <Card key={a.id} a={a} />
          ))}
          {inactivos.map((a) => (
            <Card key={a.id} a={a} />
          ))}
        </div>
      )}

      <ApartadoForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        initialData={editing}
        onSaved={cargar}
      />

      <ApartadoPagoModal
        open={paying != null}
        onOpenChange={(v) => {
          if (!v) setPaying(null);
        }}
        apartado={paying}
        onSaved={cargar}
      />
    </div>
  );
}