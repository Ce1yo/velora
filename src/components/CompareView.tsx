"use client";

import { useEffect, useState } from "react";
import { AreaChart } from "@/components/charts/AreaChart";
import { formatNumber, formatPct } from "@/lib/format";

const COLORS = ["#34d399", "#60a5fa", "#f59e0b", "#f87171"];

interface Sys {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  stationCount: number | null;
}

export function CompareView({ systems }: { systems: Sys[] }) {
  const [selected, setSelected] = useState<string[]>(systems.slice(0, 3).map((s) => s.id));
  const [details, setDetails] = useState<Record<string, any>>({});
  const [histories, setHistories] = useState<Record<string, any[]>>({});

  useEffect(() => {
    for (const id of selected) {
      if (!details[id]) {
        fetch(`/api/systems/${encodeURIComponent(id)}`).then((r) => r.json()).then((d) => setDetails((m) => ({ ...m, [id]: d })));
        fetch(`/api/systems/${encodeURIComponent(id)}/history?range=7d`).then((r) => r.json()).then((d) => setHistories((m) => ({ ...m, [id]: d.points ?? [] })));
      }
    }
  }, [selected, details]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s));

  const rows: [string, (d: any) => React.ReactNode][] = [
    ["Stations", (d) => formatNumber(d?.stationCount)],
    ["Bikes available", (d) => formatNumber(d?.latest?.bikesAvailable)],
    ["E-bikes", (d) => (d?.latest?.ebikesAvailable != null ? formatNumber(d.latest.ebikesAvailable) : "n/a")],
    ["Empty stations", (d) => formatNumber(d?.latest?.emptyStations)],
    ["Full stations", (d) => formatNumber(d?.latest?.fullStations)],
    ["Availability", (d) => formatPct(d?.latest?.availability)],
    ["Country", (d) => d?.country ?? "—"],
    ["History since", (d) => (d?.historySince ? new Date(d.historySince).toLocaleDateString("en-GB", { month: "short", day: "numeric" }) : "—")],
    ["Trips data", (d) => (d?.tripCount ? formatNumber(d.tripCount) : "n/a")],
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {systems.map((s) => {
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono border transition-colors ${
                active ? "border-ok/60 text-white bg-ok/10" : "border-white/10 text-[#8b93a7] hover:text-white"
              }`}
            >
              {(s.city ?? s.name).toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-white/[0.07] overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-white/[0.02]">
            <tr className="border-b border-white/[0.07]">
              <th className="text-left px-4 py-2.5 text-[9px] font-mono tracking-[0.2em] text-[#5b6274] font-normal">METRIC</th>
              {selected.map((id, i) => (
                <th key={id} className="text-right px-4 py-2.5 font-normal">
                  <span className="text-sm font-medium" style={{ color: COLORS[i] }}>
                    {details[id]?.name ?? id}
                  </span>
                  <span className="block text-[9px] font-mono text-[#5b6274]">{details[id]?.city ?? ""}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label} className="border-b border-white/[0.04]">
                <td className="px-4 py-2 text-[10px] font-mono tracking-widest text-[#5b6274]">{label.toUpperCase()}</td>
                {selected.map((id) => (
                  <td key={id} className="px-4 py-2 text-right font-mono text-xs">
                    {details[id] ? fn(details[id]) : "…"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {selected.map((id, i) => (
          <div key={id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
            <div className="text-[10px] font-mono tracking-widest mb-1" style={{ color: COLORS[i] }}>
              {(details[id]?.city ?? id).toUpperCase()} — BIKES / 7D
            </div>
            <AreaChart
              data={(histories[id] ?? []).map((p: any) => ({ x: new Date(p.ts).getTime(), y: p.bikes }))}
              color={COLORS[i]}
              height={90}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
