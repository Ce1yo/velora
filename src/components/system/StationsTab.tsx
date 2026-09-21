"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNumber, timeAgo } from "@/lib/format";

function useFavorites() {
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    try {
      setFavs(JSON.parse(localStorage.getItem("velora:favStations") ?? "[]"));
    } catch {}
  }, []);
  const toggle = (id: string) => {
    setFavs((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      localStorage.setItem("velora:favStations", JSON.stringify(next));
      return next;
    });
  };
  return { favs, toggle };
}

export function StationsTab({ systemId, onSelect }: { systemId: string; onSelect: (pk: string) => void }) {
  const [stations, setStations] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const { favs, toggle } = useFavorites();

  useEffect(() => {
    fetch(`/api/systems/${encodeURIComponent(systemId)}/stations`)
      .then((r) => r.json())
      .then(setStations);
  }, [systemId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? stations.filter((st) => st.name.toLowerCase().includes(s)) : stations;
    return [...list].sort((a, b) => (favs.includes(b.id) ? 1 : 0) - (favs.includes(a.id) ? 1 : 0) || (b.status?.bikes ?? 0) - (a.status?.bikes ?? 0));
  }, [stations, q, favs]);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter stations…"
          className="w-64 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs outline-none focus:border-white/25"
        />
        <span className="text-[10px] font-mono text-[#5b6274]">{filtered.length} stations</span>
        <div className="ml-auto flex gap-2">
          <a href={`/api/export/${encodeURIComponent(systemId)}?format=csv`} className="px-3 py-1.5 rounded-md border border-white/10 text-[10px] font-mono tracking-widest text-[#8b93a7] hover:text-white">
            EXPORT CSV
          </a>
          <a href={`/api/export/${encodeURIComponent(systemId)}?format=json`} className="px-3 py-1.5 rounded-md border border-white/10 text-[10px] font-mono tracking-widest text-[#8b93a7] hover:text-white">
            EXPORT JSON
          </a>
        </div>
      </div>
      <div className="rounded-lg border border-white/[0.07] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02]">
            <tr className="text-[9px] font-mono tracking-[0.2em] text-[#5b6274] border-b border-white/[0.07]">
              <th className="px-3 py-2.5 w-8" />
              <th className="text-left px-3 py-2.5 font-normal">STATION</th>
              <th className="text-right px-3 py-2.5 font-normal">CAPACITY</th>
              <th className="text-right px-3 py-2.5 font-normal">BIKES</th>
              <th className="text-right px-3 py-2.5 font-normal">DOCKS</th>
              <th className="text-right px-3 py-2.5 font-normal">E-BIKES</th>
              <th className="text-right px-3 py-2.5 font-normal hidden md:table-cell">UPDATED</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((s) => {
              const bikes = s.status?.bikes;
              const color = bikes == null ? "#5b6274" : bikes === 0 ? "#f87171" : s.capacity && bikes / s.capacity < 0.2 ? "#f59e0b" : s.capacity && bikes / s.capacity > 0.8 ? "#60a5fa" : "#34d399";
              return (
                <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer" onClick={() => onSelect(s.id)}>
                  <td className="px-3 py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(s.id);
                      }}
                      className={favs.includes(s.id) ? "text-warn" : "text-[#3a4154] hover:text-warn"}
                    >
                      ★
                    </button>
                  </td>
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-[#8b93a7]">{formatNumber(s.capacity)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs" style={{ color }}>{bikes ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-[#8b93a7]">{s.status?.docks ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-[#8b93a7]">{s.status?.ebikes ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-[10px] text-[#5b6274] hidden md:table-cell">{s.ts ? timeAgo(s.ts) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
