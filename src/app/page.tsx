import { prisma } from "@/lib/db";
import { WorldMap } from "@/components/map/WorldMap";
import { formatNumber } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function overview() {
  const [systems, mapped, live, stations, cities, countries, bikesRows] = await Promise.all([
    prisma.system.count(),
    prisma.system.count({ where: { lat: { not: null } } }),
    prisma.system.count({ where: { feedStatus: "LIVE", enabled: true } }),
    prisma.station.count(),
    prisma.system.findMany({ where: { lat: { not: null }, city: { not: null } }, distinct: ["city"], select: { city: true } }),
    prisma.system.findMany({ where: { lat: { not: null }, country: { not: null } }, distinct: ["country"], select: { country: true } }),
    prisma.$queryRaw<{ bikes: bigint | number | null }[]>`
      SELECT COALESCE(SUM(s.bikesAvailable),0) AS bikes FROM SystemSnapshot s
      INNER JOIN (SELECT systemId, MAX(ts) m FROM SystemSnapshot GROUP BY systemId) t
      ON s.systemId=t.systemId AND s.ts=t.m`,
  ]);
  return {
    systems,
    mapped,
    live,
    stations,
    cities: cities.length,
    countries: countries.length,
    bikes: Number(bikesRows[0]?.bikes ?? 0),
  };
}

export default async function Home() {
  const o = await overview();
  return (
    <main className="fixed inset-0 pt-14 overflow-hidden">
      {/* Map layer - z-0 */}
      <div className="absolute inset-0 z-0">
        <WorldMap />
      </div>

      {/* Hero overlay - z-10, pointer-events-none sauf boutons */}
      <div className="absolute top-8 left-4 sm:left-8 z-10 pointer-events-none fade-up">
        <div className="text-[10px] font-mono tracking-[0.3em] text-ok mb-3">WORLDWIDE SHARED MOBILITY</div>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-none">
          Explore how<br />cities move.
        </h1>
        <p className="mt-4 text-sm text-[#8b93a7] max-w-sm">
          Live availability, stations and mobility patterns for shared bike
          systems — built on open GBFS data and history collected by VELORA.
        </p>
        <div className="pointer-events-auto mt-5 flex gap-2">
          <Link
            href="/systems/lyon"
            className="px-4 py-2 rounded-md bg-ok/90 text-ink-950 text-xs font-mono tracking-widest font-semibold hover:bg-ok transition-colors"
          >
            EXPLORE LYON →
          </Link>
          <Link
            href="/systems"
            className="px-4 py-2 rounded-md border border-white/15 text-xs font-mono tracking-widest text-[#c8cdd9] hover:bg-white/[0.06] transition-colors"
          >
            ALL SYSTEMS
          </Link>
        </div>
      </div>

      {/* Bottom stats bar - z-10 */}
      <div className="absolute bottom-0 inset-x-0 z-10 border-t border-white/[0.08] bg-ink-950/90 backdrop-blur-md pointer-events-none">
        <div className="px-4 sm:px-8 py-4 grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[
            ["LIVE SYSTEMS", o.live],
            ["SYSTEMS MAPPED", o.mapped],
            ["CITIES", o.cities],
            ["COUNTRIES", o.countries],
            ["STATIONS", o.stations],
            ["BIKES AVAILABLE", o.bikes],
          ].map(([label, v]) => (
            <div key={label as string}>
              <div className="text-[9px] font-mono tracking-[0.2em] text-[#5b6274]">{label}</div>
              <div className="text-xl sm:text-2xl font-mono font-semibold tabular-nums">{formatNumber(v as number)}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
