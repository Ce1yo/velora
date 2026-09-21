"use client";

import { useEffect, useState } from "react";
import { AreaChart } from "@/components/charts/AreaChart";
import { formatNumber, formatTime, timeAgo } from "@/lib/format";

export function StationSidebar({ stationPk, onClose }: { stationPk: string | null; onClose: () => void }) {
  const [station, setStation] = useState<any>(null);
  const [history, setHistory] = useState<{ ts: string; bikes: number }[]>([]);

  useEffect(() => {
    if (!stationPk) return;
    setStation(null);
    setHistory([]);
    fetch(`/api/stations/${encodeURIComponent(stationPk)}`).then((r) => r.json()).then(setStation);
    fetch(`/api/stations/${encodeURIComponent(stationPk)}/history?hours=24`)
      .then((r) => r.json())
      .then((d) => setHistory(d.points ?? []));
  }, [stationPk]);

  if (!stationPk) return null;
  const l = station?.latest;

  return (
    <aside className="absolute top-0 right-0 bottom-0 w-full sm:w-[340px] bg-ink-900/95 backdrop-blur-md border-l border-white/10 p-5 overflow-auto fade-up z-10">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274]">STATION</div>
          <h2 className="text-lg font-semibold leading-tight mt-1">{station?.name ?? "…"}</h2>
        </div>
        <button onClick={onClose} className="text-[#5b6274] hover:text-white text-xl leading-none px-1">×</button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5">
        {[
          ["CAPACITY", formatNumber(station?.capacity)],
          ["BIKES AVAILABLE", l ? formatNumber(l.bikesAvailable) : "—"],
          ["DOCKS AVAILABLE", l ? formatNumber(l.docksAvailable) : "—"],
          ["E-BIKES", l?.ebikesAvailable != null ? formatNumber(l.ebikesAvailable) : "n/a"],
          ["STATUS", l ? (l.isRenting && l.isInstalled ? "OPEN" : "CLOSED") : "—"],
          ["LAST UPDATE", l ? formatTime(l.ts) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="text-[9px] font-mono tracking-[0.18em] text-[#5b6274]">{k}</div>
            <div className="text-lg font-mono font-semibold mt-0.5">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274]">AVAILABILITY — 24H</div>
          {station?.historySince && (
            <div className="text-[9px] font-mono text-[#5b6274]">since {new Date(station.historySince).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
          )}
        </div>
        <AreaChart
          data={history.map((p) => ({ x: new Date(p.ts).getTime(), y: p.bikes }))}
          height={120}
          formatX={(x) => new Date(x).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        />
        <div className="text-[9px] font-mono text-[#5b6274] mt-2">Historical data collected by VELORA</div>
      </div>

      <div className="mt-4 text-[10px] font-mono text-[#5b6274] space-y-1">
        <div>lat {station?.lat?.toFixed(5)} · lon {station?.lon?.toFixed(5)}</div>
        <div>station_id {station?.stationId}</div>
        {l?.ts && <div>reported {timeAgo(l.ts)}</div>}
      </div>
    </aside>
  );
}
