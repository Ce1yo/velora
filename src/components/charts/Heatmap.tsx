"use client";

interface Props {
  // cells[day 0=Sun..6][hour 0..23] -> value 0..1 | null
  cells: { day: number; hour: number; value: number | null }[][];
  height?: number;
}

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function colorFor(v: number | null): string {
  if (v == null) return "rgba(255,255,255,0.03)";
  // low availability -> red, mid -> amber, high -> green
  const hue = v < 0.5 ? 8 + v * 80 : 45 + (v - 0.5) * 180;
  const light = 30 + v * 30;
  return `hsl(${hue}, 70%, ${light}%)`;
}

export function Heatmap({ cells, height = 190 }: Props) {
  const W = 800;
  const H = 200;
  const pad = { l: 38, r: 4, t: 18, b: 4 };
  const cw = (W - pad.l - pad.r) / 24;
  const ch = (H - pad.t - pad.b) / 7;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      {[0, 6, 12, 18, 23].map((h) => (
        <text key={h} x={pad.l + h * cw + cw / 2} y={10} fontSize="9" fill="#5b6274" textAnchor="middle" fontFamily="monospace">
          {String(h).padStart(2, "0")}
        </text>
      ))}
      {cells.map((row, day) => (
        <g key={day}>
          <text x={4} y={pad.t + day * ch + ch * 0.7} fontSize="9" fill="#5b6274" fontFamily="monospace">
            {DAYS[day]}
          </text>
          {row.map((c) => (
            <rect
              key={c.hour}
              x={pad.l + c.hour * cw + 0.5}
              y={pad.t + day * ch + 0.5}
              width={cw - 1}
              height={ch - 1}
              rx={2}
              fill={colorFor(c.value)}
            >
              <title>{`${DAYS[day]} ${String(c.hour).padStart(2, "0")}:00 — ${c.value == null ? "no data" : (c.value * 100).toFixed(0) + "% availability"}`}</title>
            </rect>
          ))}
        </g>
      ))}
    </svg>
  );
}
