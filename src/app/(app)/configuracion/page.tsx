"use client";

import { useState } from "react";
import { toast } from "sonner";
import { User, KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
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

export default function ConfiguracionPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [nombre, setNombre] = useState(user?.nombre ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [guardando, setGuardando] = useState(false);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cambiando, setCambiando] = useState(false);

  async function guardarPerfil() {
    setGuardando(true);
    try {
      const res = await api.patch<{ user: { id: string; nombre: string; email: string } }>("/api/auth/profile", {
        nombre,
        email,
      });
      setUser(res.user);
      toast.success("Perfil actualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el perfil");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarPassword() {
    if (!actual || !nueva || !confirmar) {
      toast.error("Completá todos los campos");
      return;
    }
    if (nueva !== confirmar) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setCambiando(true);
    try {
      await api.post("/api/auth/password", { actual, nueva });
      toast.success("Contraseña actualizada");
      setActual("");
      setNueva("");
      setConfirmar("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar la contraseña");
    } finally {
      setCambiando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-4 text-primary" /> Perfil
            </CardTitle>
            <CardDescription>Tu nombre y correo para iniciar sesión</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-nombre">Nombre</Label>
              <Input id="cfg-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-email">Correo</Label>
              <Input id="cfg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <Button
              className="btn-gradient gap-1.5"
              disabled={guardando || !nombre.trim() || !email.trim()}
              onClick={guardarPerfil}
            >
              {guardando ? "Guardando…" : "Guardar cambios"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" /> Contraseña
            </CardTitle>
            <CardDescription>Cambiá tu contraseña de acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-actual">Contraseña actual</Label>
              <Input id="cfg-actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-nueva">Contraseña nueva</Label>
              <Input id="cfg-nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-confirmar">Confirmar contraseña nueva</Label>
              <Input id="cfg-confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" />
            </div>
            <Button className="btn-gradient gap-1.5" disabled={cambiando} onClick={cambiarPassword}>
              {cambiando ? "Cambiando…" : "Cambiar contraseña"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}