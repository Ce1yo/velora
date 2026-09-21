"use client";

import { useEffect, useState } from "react";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart } from "@/components/charts/BarChart";
import { formatPct } from "@/lib/format";

const RANGES = [
  { key: "24h", label: "24H" },
  { key: "7d", label: "7 DAYS" },
  { key: "30d", label: "30 DAYS" },
  { key: "90d", label: "3 MONTHS" },
  { key: "1y", label: "1 YEAR" },
];

export function HistoryTab({ systemId, hasEbikes }: { systemId: string; hasEbikes: boolean }) {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<{ points: any[]; collectedSince: string | null } | null>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/systems/${encodeURIComponent(systemId)}/history?range=${range}`)
      .then((r) => r.json())
      .then(setData);
  }, [systemId, range]);

  const pts = data?.points ?? [];
  const x = (p: any) => new Date(p.ts).getTime();

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="flex items-center gap-2 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono tracking-widest border transition-colors ${
              range === r.key ? "border-ok/60 text-white bg-ok/10" : "border-white/10 text-[#8b93a7] hover:text-white"
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="ml-auto text-[10px] font-mono text-[#5b6274]">
          {data?.collectedSince
            ? `COLLECTED BY VELORA SINCE ${new Date(data.collectedSince).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}`
            : "HISTORICAL DATA COLLECTED BY VELORA"}
        </div>
      </div>

      <section>
        <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274] mb-2">BIKES AVAILABLE</h3>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
          <AreaChart data={pts.map((p) => ({ x: x(p), y: p.bikes }))} color="#34d399" />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274] mb-2">AVAILABILITY RATE</h3>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
            <AreaChart data={pts.map((p) => ({ x: x(p), y: p.availability }))} color="#60a5fa" formatY={(v) => formatPct(v)} />
          </div>
        </section>
        <section>
          <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274] mb-2">EMPTY STATIONS</h3>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
            <AreaChart data={pts.map((p) => ({ x: x(p), y: p.emptyStations }))} color="#f87171" />
          </div>
        </section>
        <section>
          <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274] mb-2">FULL STATIONS</h3>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
            <AreaChart data={pts.map((p) => ({ x: x(p), y: p.fullStations }))} color="#f59e0b" />
          </div>
        </section>
        <section>
          <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274] mb-2">
            E-BIKES AVAILABLE{!hasEbikes && " — not reported by this feed"}
          </h3>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
            <AreaChart data={pts.map((p) => ({ x: x(p), y: p.ebikes }))} color="#a78bfa" />
          </div>
        </section>
      </div>

      <section>
        <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274] mb-2">ACTIVE STATIONS</h3>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
          <AreaChart data={pts.map((p) => ({ x: x(p), y: p.stationCount }))} color="#8b93a7" />
        </div>
      </section>
    </div>
  );
}
