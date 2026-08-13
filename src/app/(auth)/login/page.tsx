"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Ingresá tu correo y contraseña");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ user: { id: number; nombre: string; email: string } }>("/api/auth/login", {
        email,
        password,
      });
      setUser(res.user);
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar sesión");
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
            <p className="text-sm text-muted-foreground">Ingresá con tu correo y contraseña</p>
          </div>
        </div>
        <form onSubmit={ingresar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" className="btn-gradient w-full py-5 text-base" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}