import clsx from "clsx";

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-mono tracking-[0.18em] text-[#5b6274] uppercase truncate">{label}</div>
      <div className={clsx("text-2xl font-semibold tabular-nums leading-tight", accent && "font-mono")} style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-[#8b93a7] truncate">{sub}</div>}
    </div>
  );
}
