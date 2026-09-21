"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  systemId: string;
  historySince: string | null;
  onFrame: (fc: GeoJSON.FeatureCollection | null) => void;
}

export function TimeMachineTab({ systemId, historySince, onFrame }: Props) {
  const [t, setT] = useState(1); // 0..1 fraction of collected window
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = historySince ? new Date(historySince).getTime() : null;
  const end = Date.now();
  const hasHistory = start != null && end - start > 10 * 60_000;

  const fetchFrame = useCallback(
    async (frac: number) => {
      if (start == null) return;
      const target = new Date(start + frac * (end - start));
      setAt(target);
      const d = await fetch(`/api/systems/${encodeURIComponent(systemId)}/timemachine?at=${target.toISOString()}`).then((r) => r.json());
      onFrame(d.geojson ?? null);
    },
    [systemId, start, end, onFrame]
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchFrame(t), 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [t, fetchFrame]);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => setT((v) => (v >= 1 ? 0 : Math.min(1, v + 0.01))), 350);
    } else if (timer.current) {
      clearInterval(timer.current);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing]);

  if (!hasHistory) {
    return (
      <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none">
        <div className="rounded-lg border border-white/10 bg-ink-900/90 backdrop-blur px-5 py-3 text-xs font-mono text-[#8b93a7]">
          Time Machine needs collected history — VELORA started collecting {start ? new Date(start).toLocaleString("en-GB") : "soon"}.
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 inset-x-4 sm:inset-x-16 pointer-events-auto">
      <div className="rounded-xl border border-white/10 bg-ink-900/90 backdrop-blur-md px-5 py-4 flex items-center gap-4">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="w-9 h-9 rounded-full border border-ok/50 text-ok text-xs font-mono hover:bg-ok/10 shrink-0"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(t * 1000)}
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value) / 1000);
          }}
          className="flex-1 accent-emerald-400"
        />
        <div className="text-[10px] font-mono text-[#8b93a7] w-40 text-right shrink-0">
          {at ? at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
          <div className="text-[9px] text-[#5b6274]">HISTORICAL DATA COLLECTED BY VELORA</div>
        </div>
      </div>
    </div>
  );
}
