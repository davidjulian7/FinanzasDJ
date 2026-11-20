import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SummaryCard({
  label,
  value,
  icon: Icon,
  color = "var(--brand)",
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color?: string;
  hint?: string;
}) {
  return (
    <div className="glass glow-hover relative overflow-hidden rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex size-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22` }}>
          <Icon className="size-4" style={{ color }} />
        </div>
      </div>
      <p className={cn("mt-3 font-mono text-2xl font-bold tracking-tight sm:text-[1.7rem]")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
