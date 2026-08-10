"use client";

import { useRangeStore } from "@/stores/range";
import { RANGE_PRESETS, computeRange, type RangePreset } from "@/lib/ranges";
import { cn } from "@/lib/utils";

export function DateRangePicker() {
  const preset = useRangeStore((s) => s.preset);
  const from = useRangeStore((s) => s.from);
  const to = useRangeStore((s) => s.to);
  const setPreset = useRangeStore((s) => s.setPreset);
  const setCustom = useRangeStore((s) => s.setCustom);

  const fallback = computeRange(preset as RangePreset, from || undefined, to || undefined);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
        {RANGE_PRESETS.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-300",
                active ? "btn-gradient text-white shadow" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-2 py-1.5">
        <input
          type="date"
          aria-label="Desde"
          value={from || fallback.from}
          onChange={(e) => setCustom(e.target.value, to || new Date().toISOString().slice(0, 10))}
          className="bg-transparent text-xs text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark]"
        />
        <span className="text-muted-foreground">→</span>
        <input
          type="date"
          aria-label="Hasta"
          value={to || fallback.to}
          onChange={(e) => setCustom(from || fallback.from, e.target.value)}
          className="bg-transparent text-xs text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark]"
        />
      </div>
    </div>
  );
}
