"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Wallet, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@supabase/ssr";

type Step = "loading" | "request" | "sent" | "reset";

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("type=recovery")) {
      setStep("request");
      return;
    }

    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      const supabase = getSupabase();
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) throw error;
          window.history.replaceState({}, "", "/reset-password");
          setStep("reset");
        })
        .catch(() => {
          toast.error("El enlace de recuperación expiró o no es válido");
          setStep("request");
        });
    } else {
      setStep("request");
    }
  }, []);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Ingresa tu correo electrónico");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar correo");
      setStep("sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el correo");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error("Completa ambos campos");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Contraseña actualizada correctamente");
      router.replace("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la contraseña");
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
          <div className="btn-gradient flex size-14 items-center justify-center rounded-2xl shadow-lg shadow-slate-900/50">
            <Wallet className="size-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">FinanzasDJ</h1>
            <p className="text-sm text-muted-foreground">
              {step === "loading" && "Verificando enlace…"}
              {step === "request" && "Recupera tu contraseña"}
              {step === "sent" && "Revisa tu correo"}
              {step === "reset" && "Crea tu nueva contraseña"}
            </p>
          </div>
        </div>

        {step === "loading" && (
          <div className="flex justify-center py-8">
            <div className="size-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        )}

        {step === "sent" && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <CheckCircle className="size-12 text-brand" />
            </div>
            <p className="text-sm text-muted-foreground">
              Enviamos un enlace de recuperación a <span className="font-medium">{email}</span>. Revisa tu bandeja de entrada y haz clic en el enlace para crear una nueva contraseña.
            </p>
            <Button
              type="button"
              className="btn-gradient w-full py-5 text-base"
              onClick={() => setStep("request")}
            >
              Enviar a otro correo
            </Button>
          </div>
        )}

        {step === "request" && (
          <form onSubmit={requestReset} className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-email"
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
            <Button type="submit" className="btn-gradient w-full py-5 text-base" disabled={loading}>
              {loading ? "Enviando…" : "Enviar enlace de recuperación"}
            </Button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
            </div>
            <Button type="submit" className="btn-gradient w-full py-5 text-base" disabled={loading}>
              {loading ? "Guardando…" : "Cambiar contraseña"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <a href="/login" className="font-semibold text-brand hover:underline">
            Volver a iniciar sesión
          </a>
        </div>
      </motion.div>
    </div>
  );
}
