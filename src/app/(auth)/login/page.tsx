"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const authed = useAuthStore((s) => s.authed);
  const setAuthed = useAuthStore((s) => s.setAuthed);
  const router = useRouter();

  useEffect(() => {
    if (authed) router.replace("/dashboard");
  }, [authed, router]);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pin)) {
      toast.error("El PIN debe tener entre 4 y 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ ok: boolean }>("/api/auth/verify", { pin });
      if (res.ok) {
        setAuthed(true);
        router.replace("/dashboard");
      } else {
        toast.error("PIN incorrecto");
        setPin("");
      }
    } catch {
      toast.error("No se pudo verificar el PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-brand/25 blur-[140px]" />
      <div className="absolute -bottom-40 left-10 h-[350px] w-[350px] rounded-full bg-info/15 blur-[120px]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass relative w-full max-w-sm rounded-3xl border border-border p-8 shadow-2xl shadow-black/40"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="btn-gradient flex size-14 items-center justify-center rounded-2xl shadow-lg shadow-purple-900/50">
            <Wallet className="size-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">FinanzasDJ</h1>
            <p className="text-sm text-muted-foreground">Ingresá tu PIN para acceder</p>
          </div>
        </div>
        <form onSubmit={ingresar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN de acceso</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="pl-9 text-center font-mono text-lg tracking-[0.5em]"
              />
            </div>
          </div>
          <Button type="submit" className="btn-gradient w-full py-5 text-base" disabled={loading}>
            {loading ? "Verificando…" : "Ingresar"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">PIN por defecto: 1234 · podés cambiarlo desde el menú de cuenta</p>
      </motion.div>
    </div>
  );
}
