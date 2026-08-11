import { isoDate } from "./format";

export type RangePreset = "hoy" | "7d" | "2s" | "mes" | "3m" | "anio" | "todo" | "custom";

export interface DateRange {
  from: string;
  to: string;
}

export const RANGE_PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: "hoy", label: "Hoy" },
  { id: "7d", label: "Últimos 7 días" },
  { id: "2s", label: "Quincena" },
  { id: "mes", label: "Este mes" },
  { id: "3m", label: "Últimos 3 meses" },
  { id: "anio", label: "Este año" },
  { id: "todo", label: "Todo" },
];

const DAY = 86400000;

export function computeRange(preset: RangePreset, from?: string, to?: string, today = new Date()): DateRange {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  switch (preset) {
    case "hoy":
      return { from: isoDate(t), to: isoDate(t) };
    case "7d":
      return { from: isoDate(new Date(t.getTime() - 6 * DAY)), to: isoDate(t) };
    case "2s":
      return { from: isoDate(new Date(t.getTime() - 13 * DAY)), to: isoDate(t) };
    case "mes":
      return { from: isoDate(new Date(t.getFullYear(), t.getMonth(), 1)), to: isoDate(t) };
    case "3m":
      return { from: isoDate(new Date(t.getTime() - 89 * DAY)), to: isoDate(t) };
    case "anio":
      return { from: isoDate(new Date(t.getFullYear(), 0, 1)), to: isoDate(t) };
    case "todo":
      return { from: "1970-01-01", to: isoDate(t) };
    case "custom":
      return {
        from: from && from <= (to ?? isoDate(t)) ? from : "1970-01-01",
        to: to ?? isoDate(t),
      };
    default:
      return { from: isoDate(new Date(t.getFullYear(), t.getMonth(), 1)), to: isoDate(t) };
  }
}

export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = new Date(fy, fm - 1, fd).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.round((b - a) / DAY) + 1;
}
