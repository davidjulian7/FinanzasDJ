"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  HandCoins,
  Sun,
  Moon,
  LogOut,
  Wallet,
  CalendarClock,
  Coins,
  Settings,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transacciones", label: "Transacciones", icon: ArrowLeftRight },
  { href: "/cuentas", label: "Cuentas", icon: CreditCard },
  { href: "/presupuesto", label: "Presupuesto", icon: PiggyBank },
  { href: "/presupuesto/apartados", label: "Apartados", icon: Coins },
  { href: "/gastos-recurrentes", label: "Gastos recurrentes", icon: CalendarClock },
  { href: "/deudas", label: "Deudas", icon: HandCoins },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/transacciones": "Transacciones",
  "/cuentas": "Cuentas",
  "/presupuesto": "Presupuesto",
  "/presupuesto/configuracion": "Configurar presupuesto",
  "/presupuesto/quincena": "Ejecución quincena",
  "/presupuesto/apartados": "Apartados",
  "/gastos-recurrentes": "Gastos recurrentes",
  "/deudas": "Deudas",
  "/configuracion": "Configuración",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (!user) return null;

  const title = TITLES[pathname] ?? "FinanzasDJ";
  const iniciales = user.nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

  async function cerrarSesion() {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* noop */
    }
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar/60 backdrop-blur-xl md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-6 py-6">
          <div className="btn-gradient flex size-10 items-center justify-center rounded-xl shadow-lg shadow-slate-900/40">
            <Wallet className="size-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">Finanzas</p>
            <p className="text-xs text-muted-foreground">Control personal</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-300",
                  active
                    ? "btn-gradient text-white shadow-lg shadow-slate-900/40"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3">
                <div className="btn-gradient flex size-8 items-center justify-center rounded-full text-xs font-bold text-white">
                  {iniciales}
                </div>
                <span className="text-sm">{user.nombre}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />} Modo {resolvedTheme === "dark" ? "claro" : "oscuro"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={cerrarSesion}>
                <LogOut className="size-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:ml-64 md:h-16 md:px-8">
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/dashboard" className="btn-gradient flex size-8 items-center justify-center rounded-lg">
            <Wallet className="size-4 text-white" />
          </Link>
          <span className="font-bold">Finanzas</span>
        </div>
        <h1 className="hidden text-xl font-bold md:block">{title}</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            {resolvedTheme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={cerrarSesion}
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 md:ml-64 md:px-8 md:pb-10">
        {children}
      </main>

      <nav className="no-scrollbar fixed inset-x-0 bottom-0 z-30 flex items-center justify-start gap-1 overflow-x-auto border-t border-border bg-background/90 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-16 shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-5" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
