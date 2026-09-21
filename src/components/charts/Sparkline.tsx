"use client";

interface Props {
  data: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 120, height = 28, color = "#34d399" }: Props) {
  const pts = data.filter((d): d is number => d != null);
  if (pts.length < 2) {
    return <div className="text-[10px] font-mono text-[#5b6274]" style={{ width, height }}>collecting…</div>;
  }
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const d = pts
    .map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
