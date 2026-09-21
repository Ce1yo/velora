export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

export function formatPct(x: number | null | undefined, digits = 0): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

// Station color: red=empty, orange=low, green=balanced, blue=mostly full docks.
export function availabilityColor(bikes: number, capacity: number | null): string {
  const cap = capacity && capacity > 0 ? capacity : bikes + 1;
  if (bikes <= 0) return "#f87171"; // red — empty
  const ratio = bikes / cap;
  if (ratio < 0.2) return "#f59e0b"; // orange — few bikes
  if (ratio > 0.8) return "#60a5fa"; // blue — many docks taken / mostly full
  return "#34d399"; // green — healthy
}
