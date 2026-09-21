"use client";

import { useId, useMemo, useState } from "react";

export interface AreaPoint {
  x: number; // epoch ms
  y: number | null;
}

interface Props {
  data: AreaPoint[];
  height?: number;
  color?: string;
  formatX?: (x: number) => string;
  formatY?: (y: number) => string;
  label?: string;
}

export function AreaChart({
  data,
  height = 160,
  color = "#34d399",
  formatX = (x) => new Date(x).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  formatY = (y) => Math.round(y).toLocaleString(),
  label,
}: Props) {
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = 220;
  const pad = { l: 44, r: 8, t: 10, b: 22 };

  const pts = useMemo(() => data.filter((d) => d.y != null) as { x: number; y: number }[], [data]);
  const path = useMemo(() => {
    if (pts.length < 2) return { line: "", area: "", minY: 0, maxY: 1, minX: 0, maxX: 1 };
    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));
    const maxY = Math.max(...pts.map((p) => p.y), 1);
    const minY = Math.min(0, ...pts.map((p) => p.y));
    const sx = (x: number) => pad.l + ((x - minX) / Math.max(1, maxX - minX)) * (W - pad.l - pad.r);
    const sy = (y: number) => pad.t + (1 - (y - minY) / Math.max(1e-9, maxY - minY)) * (H - pad.t - pad.b);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
    const area = `${line} L${sx(pts[pts.length - 1].x).toFixed(1)},${H - pad.b} L${sx(pts[0].x).toFixed(1)},${H - pad.b} Z`;
    return { line, area, minY, maxY, minX, maxX, sx, sy };
  }, [pts, pad.l, pad.r, pad.t, pad.b]);

  if (pts.length < 2) {
    return (
      <div className="flex items-center justify-center text-[#5b6274] text-xs font-mono" style={{ height }}>
        Not enough data yet — VELORA is collecting.
      </div>
    );
  }

  const { sx = () => 0, sy = () => 0 } = path as any;
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => path.minX + f * (path.maxX - path.minX));

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    // nearest point
    let best = 0;
    let bd = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(sx(p.x) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hp = hover != null ? pts[hover] : null;

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} stroke="rgba(255,255,255,0.05)" />
        ))}
        <path d={path.area} fill={`url(#g${gid})`} />
        <path d={path.line} fill="none" stroke={color} strokeWidth="1.5" />
        {xTicks.map((x, i) => (
          <text key={i} x={sx(x)} y={H - 6} fontSize="9" fill="#5b6274" textAnchor="middle" fontFamily="monospace">
            {formatX(x)}
          </text>
        ))}
        <text x={4} y={pad.t + 8} fontSize="9" fill="#5b6274" fontFamily="monospace">{formatY(path.maxY)}</text>
        <text x={4} y={H - pad.b} fontSize="9" fill="#5b6274" fontFamily="monospace">{formatY(path.minY)}</text>
        {hp && (
          <g>
            <line x1={sx(hp.x)} x2={sx(hp.x)} y1={pad.t} y2={H - pad.b} stroke="rgba(255,255,255,0.25)" />
            <circle cx={sx(hp.x)} cy={sy(hp.y)} r="3" fill={color} />
          </g>
        )}
        <rect
          x={pad.l}
          y={pad.t}
          width={W - pad.l - pad.r}
          height={H - pad.t - pad.b}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>
      {hp && (
        <div className="absolute top-1 right-1 rounded-md border border-white/10 bg-ink-900/95 px-2 py-1 text-[10px] font-mono pointer-events-none">
          {label && <span className="text-[#5b6274] mr-2">{label}</span>}
          <span style={{ color }}>{formatY(hp.y)}</span>
          <span className="text-[#5b6274] ml-2">{formatX(hp.x)}</span>
        </div>
      )}
    </div>
  );
}
