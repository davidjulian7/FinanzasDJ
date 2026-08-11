export function formatCurrency(n: number, compact = false): string {
  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  };
  if (compact) {
    return new Intl.NumberFormat("es-MX", { ...opts, notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return new Intl.NumberFormat("es-MX", opts).format(n);
}

export function formatCompact(n: number): string {
  return formatCurrency(n, true);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return isoDate(new Date());
}

export function monthKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}
