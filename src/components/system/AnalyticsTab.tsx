"use client";

import { useEffect, useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { Heatmap } from "@/components/charts/Heatmap";
import { formatPct } from "@/lib/format";

export function AnalyticsTab({ systemId }: { systemId: string }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData(null);
    fetch(`/api/systems/${encodeURIComponent(systemId)}/analytics?days=${days}`)
      .then((r) => r.json())
      .then(setData);
  }, [systemId, days]);

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div className="flex items-center gap-2">
        {[7, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono tracking-widest border transition-colors ${
              days === d ? "border-ok/60 text-white bg-ok/10" : "border-white/10 text-[#8b93a7] hover:text-white"
            }`}
          >
            LAST {d} DAYS
          </button>
        ))}
        <div className="ml-auto text-[10px] font-mono text-[#5b6274] max-w-sm text-right">
          Metrics estimated from station inventory snapshots collected by VELORA — not trip counts.
        </div>
      </div>

      <section>
        <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274] mb-2">AVAILABILITY BY HOUR</h3>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
          <BarChart
            data={(data?.byHour ?? Array.from({ length: 24 }, (_, h) => ({ hour: h, bikes: null }))).map((h: any) => ({
              label: String(h.hour).padStart(2, "0"),
              value: h.availability != null ? h.availability * 100 : null,
            }))}
            color="#60a5fa"
            formatValue={(v) => `${v.toFixed(0)}%`}
          />
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274] mb-2">DEMAND PATTERN — DAY × HOUR (availability)</h3>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
          {data ? <Heatmap cells={data.heatmap} /> : <div className="h-48 text-xs font-mono text-[#5b6274] flex items-center justify-center">loading…</div>}
        </div>
      </section>

      <section>
        <h3 className="text-[10px] font-mono tracking-[0.25em] text-[#5b6274] mb-2">MOST ACTIVE STATIONS — estimated turnover</h3>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[9px] font-mono tracking-[0.2em] text-[#5b6274] border-b border-white/[0.07]">
                <th className="text-left px-4 py-2.5 font-normal">STATION</th>
                <th className="text-right px-4 py-2.5 font-normal">CAPACITY</th>
                <th className="text-right px-4 py-2.5 font-normal">EST. TURNOVER</th>
                <th className="text-right px-4 py-2.5 font-normal">EMPTY EVENTS</th>
                <th className="text-right px-4 py-2.5 font-normal">FULL EVENTS</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {(data?.mostActive ?? []).map((s: any) => (
                <tr key={s.stationId} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  <td className="px-4 py-2 font-sans text-sm">{s.name}</td>
                  <td className="px-4 py-2 text-right text-[#8b93a7]">{s.capacity ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-ok">{s.turnover}</td>
                  <td className="px-4 py-2 text-right text-danger">{s.emptyEvents}</td>
                  <td className="px-4 py-2 text-right text-warn">{s.fullEvents}</td>
                </tr>
              ))}
              {data && !data.mostActive?.length && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5b6274]">Not enough snapshots yet — check back after VELORA has collected more data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
