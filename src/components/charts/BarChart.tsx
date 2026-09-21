"use client";

interface Props {
  data: { label: string; value: number | null }[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 140, color = "#60a5fa", formatValue = (v) => Math.round(v).toLocaleString() }: Props) {
  const W = 800;
  const H = 200;
  const pad = { l: 40, r: 8, t: 8, b: 20 };
  const max = Math.max(...data.map((d) => d.value ?? 0), 1);
  const bw = (W - pad.l - pad.r) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const v = d.value ?? 0;
        const h = (v / max) * (H - pad.t - pad.b);
        return (
          <g key={i}>
            <rect
              x={pad.l + i * bw + bw * 0.15}
              y={H - pad.b - h}
              width={bw * 0.7}
              height={Math.max(h, v > 0 ? 1 : 0)}
              fill={color}
              opacity={d.value == null ? 0.15 : 0.85}
              rx={1.5}
            >
              <title>{`${d.label}: ${d.value == null ? "no data" : formatValue(d.value)}`}</title>
            </rect>
            {(data.length <= 24 || i % 2 === 0) && (
              <text x={pad.l + i * bw + bw / 2} y={H - 6} fontSize="9" fill="#5b6274" textAnchor="middle" fontFamily="monospace">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
      <text x={4} y={pad.t + 8} fontSize="9" fill="#5b6274" fontFamily="monospace">{formatValue(max)}</text>
    </svg>
  );
}
