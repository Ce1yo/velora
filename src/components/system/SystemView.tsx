"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StationMap } from "@/components/map/StationMap";
import { StationSidebar } from "./StationSidebar";
import { HistoryTab } from "./HistoryTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { TimeMachineTab } from "./TimeMachineTab";
import { StationsTab } from "./StationsTab";
import { Stat } from "@/components/Stat";
import { formatNumber, formatPct, timeAgo } from "@/lib/format";

const TABS = ["LIVE", "HISTORY", "ANALYTICS", "TIME MACHINE", "STATIONS"] as const;
type Tab = (typeof TABS)[number];

export function SystemView({ system }: { system: any }) {
  const [tab, setTab] = useState<Tab>("LIVE");
  const [stationPk, setStationPk] = useState<string | null>(null);
  const [latest, setLatest] = useState<any>(system.latest);
  const [timeData, setTimeData] = useState<GeoJSON.FeatureCollection | null>(null);

  // Deep-link: ?station=<pk>
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("station");
    if (p) setStationPk(p);
  }, []);

  const refresh = useCallback(async () => {
    const s = await fetch(`/api/systems/${encodeURIComponent(system.id)}`).then((r) => r.json());
    setLatest(s.latest);
  }, [system.id]);

  useEffect(() => {
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const l = latest;

  return (
    <div className="pt-14 h-screen flex flex-col">
      {/* System header */}
      <div className="px-4 sm:px-8 pt-6 pb-4 border-b border-white/[0.08]">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${system.feedStatus === "LIVE" ? "bg-ok live-dot" : "bg-danger"}`} />
              <span className="text-[10px] font-mono tracking-[0.3em] text-[#5b6274]">
                {(system.city ?? "").toUpperCase()}{system.country ? ` · ${system.country}` : ""}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-1">{system.name}</h1>
            <div className="text-xs text-[#8b93a7] mt-1">
              {system.operator && <span>{system.operator} · </span>}
              <span className="font-mono">GBFS {system.gbfsVersion ?? "—"}</span>
              {system.url && (
                <>
                  {" · "}
                  <a href={system.url} target="_blank" rel="noreferrer" className="underline decoration-white/20 hover:text-white">
                    operator site
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-x-8 gap-y-3 ml-auto">
            <Stat label="Stations" value={formatNumber(l?.stationCount ?? system.stationCount)} />
            <Stat label="Bikes avail." value={formatNumber(l?.bikesAvailable)} accent="#34d399" />
            <Stat label="E-bikes" value={l?.ebikesAvailable != null ? formatNumber(l.ebikesAvailable) : "n/a"} accent={l?.ebikesAvailable != null ? "#60a5fa" : undefined} />
            <Stat label="Empty" value={formatNumber(l?.emptyStations)} accent={l?.emptyStations > 0 ? "#f87171" : undefined} />
            <Stat label="Full" value={formatNumber(l?.fullStations)} accent={l?.fullStations > 0 ? "#f59e0b" : undefined} />
            <Stat label="Availability" value={formatPct(l?.availability, 0)} />
            <Stat label="Updated" value={<span className="text-base">{timeAgo(l?.ts)}</span>} />
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-5 -mb-px overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-[10px] font-mono tracking-[0.2em] border-b-2 whitespace-nowrap transition-colors ${
                tab === t ? "border-ok text-white" : "border-transparent text-[#5b6274] hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto hidden sm:flex items-center text-[10px] font-mono text-[#5b6274]">
            {system.historySince ? (
              <>VELORA DATA SINCE {new Date(system.historySince).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}</>
            ) : (
              "NO HISTORY COLLECTED YET"
            )}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 relative">
        {tab === "LIVE" && (
          <>
            <StationMap systemId={system.id} onSelectStation={setStationPk} />
            <StationSidebar stationPk={stationPk} onClose={() => setStationPk(null)} />
            <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-ink-900/85 backdrop-blur px-3 py-2 text-[10px] font-mono space-y-1">
              <div className="text-[#5b6274] tracking-widest">AVAILABILITY</div>
              {[
                ["#34d399", "Bikes available"],
                ["#f59e0b", "Few bikes"],
                ["#f87171", "Empty"],
                ["#60a5fa", "Nearly full"],
              ].map(([c, t]) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  <span className="text-[#c8cdd9]">{t}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "HISTORY" && <div className="absolute inset-0 overflow-auto"><HistoryTab systemId={system.id} hasEbikes={system.hasEbikes} /></div>}
        {tab === "ANALYTICS" && <div className="absolute inset-0 overflow-auto"><AnalyticsTab systemId={system.id} /></div>}
        {tab === "TIME MACHINE" && (
          <>
            <StationMap systemId={system.id} onSelectStation={setStationPk} overrideData={timeData} />
            <StationSidebar stationPk={stationPk} onClose={() => setStationPk(null)} />
            <TimeMachineTab systemId={system.id} historySince={system.historySince} onFrame={setTimeData} />
          </>
        )}
        {tab === "STATIONS" && <div className="absolute inset-0 overflow-auto"><StationsTab systemId={system.id} onSelect={(id) => { setStationPk(id); setTab("LIVE"); }} /></div>}
      </div>
    </div>
  );
}
