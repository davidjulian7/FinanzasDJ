"use client";

import { useState } from "react";
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
import { api } from "@/lib/api";

export function ChangePinDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [pinActual, setPinActual] = useState("");
  const [pinNuevo, setPinNuevo] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);

  async function guardar() {
    if (pinNuevo !== confirma) {
      toast.error("Los PIN nuevos no coinciden");
      return;
    }
    if (!/^\d{4,6}$/.test(pinNuevo)) {
      toast.error("El PIN debe tener entre 4 y 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      await api.put("/api/auth/pin", { pinActual, pinNuevo });
      toast.success("PIN actualizado");
      setPinActual("");
      setPinNuevo("");
      setConfirma("");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass">
        <DialogHeader>
          <DialogTitle>Cambiar PIN</DialogTitle>
          <DialogDescription>Actualizá el PIN de acceso a la aplicación.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pin-actual">PIN actual</Label>
            <Input
              id="pin-actual"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinActual}
              onChange={(e) => setPinActual(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="font-mono tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin-nuevo">PIN nuevo</Label>
            <Input
              id="pin-nuevo"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinNuevo}
              onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="font-mono tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin-confirmar">Confirmar PIN nuevo</Label>
            <Input
              id="pin-confirmar"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirma}
              onChange={(e) => setConfirma(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="font-mono tracking-widest"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="btn-gradient" onClick={guardar} disabled={loading}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
