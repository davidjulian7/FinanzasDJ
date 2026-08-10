"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { formatCompact, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TooltipEntry {
  color?: string;
  value?: number | string;
  name?: string | number;
  payload?: { fill?: string; name?: string | number };
}

function ChartTooltip({
  active,
  payload,
  label,
  money = true,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      {label != null && <p className="mb-1 font-medium text-muted-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 font-mono" style={{ color: p.color ?? p.payload?.fill }}>
          <span className="font-sans font-medium">{String(p.name ?? p.payload?.name ?? "")}:</span>
          {money ? formatCurrency(Number(p.value)) : String(p.value)}
        </p>
      ))}
    </div>
  );
}

export function DonutChart({ data, height = 260 }: { data: Array<{ categoria: string; monto: number; color: string }>; height?: number }) {
  const total = data.reduce((s, d) => s + d.monto, 0);
  if (!data.length) return <EmptyChart />;
  return (
    <div style={{ height }} className="relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="monto" nameKey="categoria" innerRadius="58%" outerRadius="85%" paddingAngle={3} strokeWidth={0}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-muted-foreground">Total</p>
        <p className="font-mono text-lg font-bold">{formatCompact(total)}</p>
      </div>
    </div>
  );
}

export function NetWorthChart({ data, height = 260 }: { data: Array<{ label: string; valor: number }>; height?: number }) {
  if (!data.length) return <EmptyChart />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={(v: number) => formatCompact(v)}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="valor" name="Patrimonio" stroke="#7C3AED" strokeWidth={2.5} fill="url(#gradPatrimonio)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FlowChart({ data, height = 260 }: { data: Array<{ label: string; ingresos: number; gastos: number }>; height?: number }) {
  if (!data.length) return <EmptyChart />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={58} tickFormatter={(v: number) => formatCompact(v)} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#06D6A0" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PerAccountChart({ data, height = 260 }: { data: Array<{ cuenta: string; monto: number; color: string }>; height?: number }) {
  if (!data.length) return <EmptyChart />;
  const max = Math.max(...data.map((d) => d.monto), 1);
  return (
    <div style={{ height }} className="overflow-y-auto">
      <div className="flex h-full flex-col justify-center gap-2.5 pr-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <p className="w-28 shrink-0 truncate text-right text-xs text-muted-foreground">{d.cuenta}</p>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-muted">
              <div
                className="flex h-full items-center justify-end rounded-md px-1.5 font-mono text-[10px] font-semibold text-white/90 transition-all duration-700"
                style={{ width: `${Math.max(6, (d.monto / max) * 100)}%`, background: `linear-gradient(90deg, ${d.color}aa, ${d.color})` }}
              >
                {formatCompact(d.monto)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      Sin datos en el período seleccionado
    </div>
  );
}

export function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("glass glow-hover rounded-2xl border border-border p-5", className)}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
