"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Wallet as WalletIcon } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { AccountRow, AccountTipo, CategoryRow } from "@/lib/types";
import { formatCurrency, todayISO } from "@/lib/format";
import { IconByName } from "@/components/icon-registry";
import { cn } from "@/lib/utils";

const COLORES = ["#7C3AED", "#3B82F6", "#06D6A0", "#F59E0B", "#EF4444", "#10B981", "#0EA5E9", "#EC4899", "#84CC16", "#A855F7"];
const ICONOS = ["Landmark", "Wallet", "Banknote", "CreditCard", "TrendingUp", "PiggyBank", "HandCoins", "Gift", "ShoppingBag", "Car"];

const TIPOS: Array<{ id: AccountTipo; label: string }> = [
  { id: "debito", label: "Débito" },
  { id: "credito", label: "Crédito" },
  { id: "efectivo", label: "Efectivo" },
  { id: "inversion", label: "Inversión" },
];

// Las cuentas cuyo nombre empieza con "TDC" son tarjetas de crédito.
function esNombreTDC(nombre: string): boolean {
  return nombre.trim().toUpperCase().startsWith("TDC");
}

export function AccountModal({
  open,
  onOpenChange,
  cuenta,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cuenta?: AccountRow | null;
  onSaved?: () => void;
}) {
  const [tab, setTab] = useState("cuenta");

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<AccountTipo>("debito");
  const [saldoActual, setSaldoActual] = useState("");
  const [limite, setLimite] = useState("");
  const [corte, setCorte] = useState("");
  const [pago, setPago] = useState("");
  const [color, setColor] = useState("#7C3AED");
  const [icono, setIcono] = useState("Wallet");
  const [loading, setLoading] = useState(false);

  const [categorias, setCategorias] = useState<CategoryRow[]>([]);
  const [cuentas, setCuentas] = useState<AccountRow[]>([]);
  const [movTipo, setMovTipo] = useState<"gasto" | "ingreso">("gasto");
  const [movMonto, setMovMonto] = useState("");
  const [movCategoria, setMovCategoria] = useState("");
  const [movFecha, setMovFecha] = useState(todayISO());
  const [movDescripcion, setMovDescripcion] = useState("");

  const [nuevaCat, setNuevaCat] = useState(false);
  const [catNombre, setCatNombre] = useState("");
  const [catColor, setCatColor] = useState("#7C3AED");
  const [catIcono, setCatIcono] = useState("Tag");
  const [creandoCat, setCreandoCat] = useState(false);

  const [pagoOrigen, setPagoOrigen] = useState("");
  const [pagoMonto, setPagoMonto] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab("cuenta");
    setNombre(cuenta?.nombre ?? "");
    setTipo(cuenta?.tipo ?? "debito");
    setSaldoActual(cuenta ? String(Math.round(cuenta.saldoActual)) : "");
    setLimite(cuenta?.limiteCredito ? String(cuenta.limiteCredito) : "");
    setCorte(cuenta?.fechaCorte ? String(cuenta.fechaCorte) : "");
    setPago(cuenta?.fechaPago ? String(cuenta.fechaPago) : "");
    setColor(cuenta?.color ?? "#7C3AED");
    setIcono(cuenta?.icono ?? "Wallet");
    setMovMonto("");
    setMovCategoria("");
    setMovFecha(todayISO());
    setMovDescripcion("");
    setNuevaCat(false);
    setCatNombre("");
    setCatColor("#7C3AED");
    setCatIcono("Tag");
    setPagoOrigen("");
    setPagoMonto("");
    Promise.all([api.get<CategoryRow[]>("/api/categories"), api.get<AccountRow[]>("/api/accounts")])
      .then(([cats, accs]) => {
        setCategorias(cats);
        setCuentas(accs);
      })
      .catch(() => toast.error("No se pudieron cargar categorías y cuentas"));
  }, [open, cuenta]);

  const categoriasFiltradas = useMemo(
    () => categorias.filter((c) => c.tipo === (movTipo === "ingreso" ? "ingreso" : "gasto")),
    [categorias, movTipo]
  );

  const cuentasDebito = useMemo(() => cuentas.filter((c) => c.tipo === "debito" || c.tipo === "efectivo"), [cuentas]);

  useEffect(() => {
    if (!cuenta || cuenta.tipo !== "credito" || !cuentasDebito.length) return;
    setPagoOrigen((prev) => prev || String(cuentasDebito[0].id));
    const deuda = Math.max(0, cuenta.saldoActual);
    setPagoMonto((prev) => prev || (deuda > 0 ? String(deuda) : ""));
  }, [cuenta, cuentasDebito]);

  useEffect(() => {
    if (tab === "gasto") setMovTipo("gasto");
    if (tab === "ingreso") setMovTipo("ingreso");
  }, [tab]);

  function onNombreChange(v: string) {
    setNombre(v);
    if (!cuenta && esNombreTDC(v)) {
      setTipo("credito");
      setIcono((i) => (i === "Wallet" ? "CreditCard" : i));
    }
  }

  async function guardarCuenta(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return toast.error("El nombre es obligatorio");
    const body = {
      nombre,
      tipo,
      saldoActual: Number(saldoActual) || 0,
      limiteCredito: tipo === "credito" && limite ? Number(limite) : null,
      fechaCorte: tipo === "credito" && corte ? Number(corte) : null,
      fechaPago: tipo === "credito" && pago ? Number(pago) : null,
      color,
      icono,
    };
    setLoading(true);
    try {
      if (cuenta) {
        await api.put(`/api/accounts/${cuenta.id}`, body);
        toast.success("Cuenta actualizada");
      } else {
        await api.post("/api/accounts", body);
        toast.success("Cuenta creada");
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  async function crearCategoria() {
    if (!catNombre.trim()) return toast.error("Escribí el nombre de la categoría");
    setCreandoCat(true);
    try {
      const res = await api.post<{ id: number }>("/api/categories", {
        nombre: catNombre.trim(),
        tipo: movTipo,
        color: catColor,
        icono: catIcono,
      });
      setCategorias((prev) => [
        ...prev,
        { id: res.id, nombre: catNombre.trim(), tipo: movTipo, icono: catIcono, color: catColor, grupoPresupuesto: null },
      ]);
      setMovCategoria(String(res.id));
      setNuevaCat(false);
      setCatNombre("");
      toast.success("Categoría creada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la categoría");
    } finally {
      setCreandoCat(false);
    }
  }

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault();
    if (!cuenta) return;
    const m = Number(movMonto);
    if (!Number.isFinite(m) || m <= 0) return toast.error("El monto debe ser mayor a cero");
    if (!movCategoria) return toast.error("Seleccioná una categoría");
    setLoading(true);
    try {
      await api.post("/api/transactions", {
        descripcion: movDescripcion.trim() || categorias.find((c) => String(c.id) === movCategoria)?.nombre || movTipo,
        monto: m,
        tipo: movTipo,
        accountId: cuenta.id,
        categoryId: Number(movCategoria),
        fecha: movFecha,
        notas: null,
      });
      toast.success(movTipo === "gasto" ? "Gasto registrado" : "Ingreso registrado");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar el movimiento");
    } finally {
      setLoading(false);
    }
  }

  async function pagarTarjeta(e: React.FormEvent) {
    e.preventDefault();
    if (!cuenta) return;
    const m = Number(pagoMonto);
    if (!Number.isFinite(m) || m <= 0) return toast.error("El monto debe ser mayor a cero");
    if (!pagoOrigen) return toast.error("Elegí desde qué cuenta se paga");
    const origen = cuentas.find((c) => String(c.id) === pagoOrigen);
    if (!origen) return toast.error("Seleccioná una cuenta de débito válida");
    if (origen.tipo === "credito") return toast.error("La cuenta origen debe ser de débito");
    setLoading(true);
    try {
      await api.post("/api/transactions", {
        descripcion: `Pago TDC ${cuenta.nombre}`,
        monto: m,
        tipo: "transferencia",
        accountId: Number(pagoOrigen),
        accountDestinoId: cuenta.id,
        categoryId: null,
        fecha: todayISO(),
        notas: `Pago de tarjeta de crédito`,
      });
      toast.success("Pago registrado");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar el pago");
    } finally {
      setLoading(false);
    }
  }

  if (!cuenta) {
    // Alta de cuenta: sólo formulario de configuración.
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar cuenta</DialogTitle>
            <DialogDescription>Configurá los datos de la cuenta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={guardarCuenta} className="space-y-4 py-2">
            <CamposCuenta
              nombre={nombre}
              onNombreChange={onNombreChange}
              tipo={tipo}
              setTipo={setTipo}
              saldoActual={saldoActual}
              setSaldoActual={setSaldoActual}
              limite={limite}
              setLimite={setLimite}
              corte={corte}
              setCorte={setCorte}
              pagoDia={pago}
              setPagoDia={setPago}
              color={color}
              setColor={setColor}
              icono={icono}
              setIcono={setIcono}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-gradient" disabled={loading}>
                {loading ? "Guardando…" : "Crear cuenta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  const esCredito = cuenta.tipo === "credito";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gestionar {cuenta.nombre}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span
              className="inline-flex size-6 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${cuenta.color}22`, color: cuenta.color }}
            >
              <IconByName name={cuenta.icono} className="size-3.5" />
            </span>
            <span className="font-mono font-semibold">{formatCurrency(cuenta.saldoActual)}</span>
            {esCredito && <span className="text-xs text-muted-foreground">deuda {(cuenta.tipo === "credito" && cuenta.saldoActual <= 0) && "· a favor"}</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cuenta">Cuenta</TabsTrigger>
            <TabsTrigger
              value="gasto"
              className="data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive"
            >
              Gasto
            </TabsTrigger>
            <TabsTrigger
              value="ingreso"
              className="data-[state=active]:bg-positive/20 data-[state=active]:text-positive"
            >
              Ingreso
            </TabsTrigger>
            <TabsTrigger
              value="pagar"
              className="data-[state=active]:bg-info/20 data-[state=active]:text-info"
              disabled={!esCredito}
              title={esCredito ? "Pagar la tarjeta" : "Solo disponible para tarjetas de crédito"}
            >
              Pagar TDC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cuenta">
            <form onSubmit={guardarCuenta} className="space-y-4 py-2">
              <CamposCuenta
                nombre={nombre}
                onNombreChange={onNombreChange}
                tipo={tipo}
                setTipo={setTipo}
                saldoActual={saldoActual}
                setSaldoActual={setSaldoActual}
                limite={limite}
                setLimite={setLimite}
                corte={corte}
                setCorte={setCorte}
                pagoDia={pago}
                setPagoDia={setPago}
                color={color}
                setColor={setColor}
                icono={icono}
                setIcono={setIcono}
              />
              <DialogFooter>
                <Button type="submit" className="btn-gradient" disabled={loading}>
                  {loading ? "Guardando…" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="gasto">
            <MovimientoForm
              tipo="gasto"
              monto={movMonto}
              setMonto={setMovMonto}
              categoria={movCategoria}
              setCategoria={setMovCategoria}
              fecha={movFecha}
              setFecha={setMovFecha}
              descripcion={movDescripcion}
              setDescripcion={setMovDescripcion}
              categorias={categoriasFiltradas}
              nuevaCat={nuevaCat}
              setNuevaCat={setNuevaCat}
              catNombre={catNombre}
              setCatNombre={setCatNombre}
              catColor={catColor}
              setCatColor={setCatColor}
              catIcono={catIcono}
              setCatIcono={setCatIcono}
              creandoCat={creandoCat}
              crearCategoria={crearCategoria}
              onNuevoTipo={() => setMovTipo("gasto")}
              onSubmit={registrarMovimiento}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="ingreso">
            <MovimientoForm
              tipo="ingreso"
              monto={movMonto}
              setMonto={setMovMonto}
              categoria={movCategoria}
              setCategoria={setMovCategoria}
              fecha={movFecha}
              setFecha={setMovFecha}
              descripcion={movDescripcion}
              setDescripcion={setMovDescripcion}
              categorias={categoriasFiltradas}
              nuevaCat={nuevaCat}
              setNuevaCat={setNuevaCat}
              catNombre={catNombre}
              setCatNombre={setCatNombre}
              catColor={catColor}
              setCatColor={setCatColor}
              catIcono={catIcono}
              setCatIcono={setCatIcono}
              creandoCat={creandoCat}
              crearCategoria={crearCategoria}
              onNuevoTipo={() => setMovTipo("ingreso")}
              onSubmit={registrarMovimiento}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="pagar">
            {!esCredito ? (
              <p className="py-6 text-sm text-muted-foreground">Esta opción solo está disponible para tarjetas de crédito.</p>
            ) : (
              <form onSubmit={pagarTarjeta} className="space-y-4 py-2">
                {cuenta.saldoActual <= 0 && (
                  <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    La tarjeta no tiene deuda pendiente (saldo a favor).
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Se paga desde</Label>
                    <Select value={pagoOrigen} onValueChange={setPagoOrigen}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí la cuenta de débito" />
                      </SelectTrigger>
                      <SelectContent>
                        {cuentasDebito.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nombre} · {formatCurrency(c.saldoActual)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      El monto se descuenta de esa cuenta y reduce la deuda de {cuenta.nombre}.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ac-pago-monto">Monto a pagar</Label>
                    <Input
                      id="ac-pago-monto"
                      type="number"
                      min="0"
                      step="0.01"
                      value={pagoMonto}
                      onChange={(e) => setPagoMonto(e.target.value)}
                      className="font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deuda actual</Label>
                    <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm">
                      {formatCurrency(Math.max(0, cuenta.saldoActual))}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="btn-gradient gap-1.5" disabled={loading}>
                    <ArrowLeftRight className="size-4" />
                    {loading ? "Paginando…" : "Pagar tarjeta"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CamposCuenta({
  nombre,
  onNombreChange,
  tipo,
  setTipo,
  saldoActual,
  setSaldoActual,
  limite,
  setLimite,
  corte,
  setCorte,
  pagoDia,
  setPagoDia,
  color,
  setColor,
  icono,
  setIcono,
}: {
  nombre: string;
  onNombreChange: (v: string) => void;
  tipo: AccountTipo;
  setTipo: (v: AccountTipo) => void;
  saldoActual: string;
  setSaldoActual: (v: string) => void;
  limite: string;
  setLimite: (v: string) => void;
  corte: string;
  setCorte: (v: string) => void;
  pagoDia: string;
  setPagoDia: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  icono: string;
  setIcono: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-2">
        <Label htmlFor="ac-nombre">Nombre</Label>
        <Input id="ac-nombre" value={nombre} onChange={(e) => onNombreChange(e.target.value)} placeholder="Ej: TDC BBVA" />
        {esNombreTDC(nombre) && (
          <p className="text-xs text-muted-foreground">
            Tip: los nombres que empiezan con <span className="font-semibold">TDC</span> se configuran como tarjeta de crédito.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Tipo de cuenta</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as AccountTipo)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ac-saldo">{tipo === "credito" ? "Deuda actual" : "Saldo actual"}</Label>
        <Input
          id="ac-saldo"
          type="number"
          value={saldoActual}
          onChange={(e) => setSaldoActual(e.target.value)}
          className="font-mono"
          placeholder="0"
        />
      </div>
      {tipo === "credito" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="ac-limite">Límite de crédito</Label>
            <Input id="ac-limite" type="number" value={limite} onChange={(e) => setLimite(e.target.value)} className="font-mono" placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ac-corte">Día de corte</Label>
            <Input id="ac-corte" type="number" min={1} max={31} value={corte} onChange={(e) => setCorte(e.target.value)} placeholder="12" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ac-pago">Día límite de pago</Label>
            <Input id="ac-pago" type="number" min={1} max={31} value={pagoDia} onChange={(e) => setPagoDia(e.target.value)} placeholder="5" />
          </div>
        </>
      )}
      <div className="col-span-2 space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn("size-7 rounded-full transition-transform", color === c && "scale-110 ring-2 ring-ring ring-offset-2")}
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
              onClick={() => setIcono(i)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border transition-colors",
                icono === i ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <IconByName name={i} className="size-4.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MovimientoForm({
  tipo,
  monto,
  setMonto,
  categoria,
  setCategoria,
  fecha,
  setFecha,
  descripcion,
  setDescripcion,
  categorias,
  nuevaCat,
  setNuevaCat,
  catNombre,
  setCatNombre,
  catColor,
  setCatColor,
  catIcono,
  setCatIcono,
  creandoCat,
  crearCategoria,
  onNuevoTipo,
  onSubmit,
  loading,
}: {
  tipo: "gasto" | "ingreso";
  monto: string;
  setMonto: (v: string) => void;
  categoria: string;
  setCategoria: (v: string) => void;
  fecha: string;
  setFecha: (v: string) => void;
  descripcion: string;
  setDescripcion: (v: string) => void;
  categorias: CategoryRow[];
  nuevaCat: boolean;
  setNuevaCat: (v: boolean) => void;
  catNombre: string;
  setCatNombre: (v: string) => void;
  catColor: string;
  setCatColor: (v: string) => void;
  catIcono: string;
  setCatIcono: (v: string) => void;
  creandoCat: boolean;
  crearCategoria: () => void;
  onNuevoTipo: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="mv-monto">Monto</Label>
          <Input
            id="mv-monto"
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="font-mono"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mv-fecha">Fecha</Label>
          <Input id="mv-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Descripción (opcional)</Label>
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Auto con la categoría" />
        </div>
        <div className="space-y-2">
          <Label>Categoría</Label>
          {nuevaCat ? (
            <div className="space-y-2">
              <Input
                value={catNombre}
                onChange={(e) => setCatNombre(e.target.value)}
                placeholder="Nombre de la categoría"
              />
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1">
                  {COLORES.slice(0, 5).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={cn("size-5 rounded-full", catColor === c && "ring-2 ring-ring ring-offset-1")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <Select value={catIcono} onValueChange={setCatIcono}>
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONOS.map((i) => (
                      <SelectItem key={i} value={i}>
                        <span className="flex items-center gap-2">
                          <IconByName name={i} className="size-4" /> {i}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setNuevaCat(false)}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" className="btn-gradient flex-1" disabled={creandoCat} onClick={crearCategoria}>
                  <Plus className="size-4" /> {creandoCat ? "Creando…" : "Crear"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.length === 0 && <SelectItem value="sin-cats">Sin categorías de {tipo}</SelectItem>}
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                title="Agregar categoría"
                onClick={() => {
                  setNuevaCat(true);
                  onNuevoTipo();
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" className={cn("gap-1.5", tipo === "gasto" ? "bg-destructive/90 hover:bg-destructive" : "bg-positive/90 hover:bg-positive")} disabled={loading}>
          <WalletIcon className="size-4" />
          {loading ? "Guardando…" : tipo === "gasto" ? "Registrar gasto" : "Registrar ingreso"}
        </Button>
      </DialogFooter>
    </form>
  );
}