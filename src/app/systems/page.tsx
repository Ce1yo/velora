import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatNumber, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Systems — VELORA" };

const PAGE_SIZE = 200;

export default async function SystemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; quality?: string }>;
}) {
  const { q, country, quality } = await searchParams;
  const systems = await prisma.system.findMany({
    where: {
      ...(country ? { country } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { city: { contains: q } },
              { id: { contains: q } },
              { operator: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ priority: "desc" }, { stationCount: "desc" }, { name: "asc" }],
    take: PAGE_SIZE,
  });
  const total = await prisma.system.count();
  const countries = await prisma.system.findMany({ distinct: ["country"], select: { country: true }, where: { country: { not: null } }, orderBy: { country: "asc" } });

  const latest = await prisma.$queryRaw<{ systemId: string; ts: string; bikesAvailable: number; availability: number }[]>`
    SELECT s.systemId, s.ts, s.bikesAvailable, s.availability
    FROM SystemSnapshot s
    INNER JOIN (SELECT systemId, MAX(ts) m FROM SystemSnapshot GROUP BY systemId) t
      ON s.systemId=t.systemId AND s.ts=t.m`;
  const byId = new Map(latest.map((r) => [r.systemId, r]));
  const firsts = await prisma.systemSnapshot.groupBy({ by: ["systemId"], _min: { ts: true } });
  const firstById = new Map(firsts.map((f) => [f.systemId, f._min.ts]));

  const dot = (ok: boolean | null) =>
    ok == null ? "text-[#3a4154]" : ok ? "text-ok" : "text-danger";

  return (
    <main className="pt-14 min-h-screen">
      <div className="px-4 sm:px-8 py-8">
        <div className="flex flex-wrap items-end gap-6 mb-6">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-[#5b6274] mb-2">GBFS CATALOG · MOBILITYDATA</div>
            <h1 className="text-3xl font-semibold tracking-tight">Systems</h1>
            <p className="text-sm text-[#8b93a7] mt-1">{formatNumber(total)} shared-mobility systems publishing GBFS feeds.</p>
          </div>
          <form className="flex gap-2 ml-auto" action="/systems">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Filter systems, cities, operators…"
              className="w-64 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-xs outline-none focus:border-white/25"
            />
            <select name="country" defaultValue={country ?? ""} className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1.5 text-xs outline-none">
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.country!} value={c.country!}>{c.country}</option>
              ))}
            </select>
            <button className="px-3 py-1.5 rounded-md bg-white/[0.07] text-xs font-mono">FILTER</button>
            <Link
              href={quality ? "/systems" : "/systems?quality=1"}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono tracking-widest border ${quality ? "border-ok/60 text-ok bg-ok/10" : "border-white/10 text-[#8b93a7]"}`}
            >
              DATA QUALITY
            </Link>
          </form>
        </div>

        <div className="rounded-lg border border-white/[0.07] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-[9px] font-mono tracking-[0.2em] text-[#5b6274] border-b border-white/[0.07]">
                <th className="text-left px-4 py-2.5 font-normal">SYSTEM</th>
                <th className="text-left px-4 py-2.5 font-normal">CITY</th>
                <th className="text-left px-4 py-2.5 font-normal">COUNTRY</th>
                <th className="text-right px-4 py-2.5 font-normal">STATIONS</th>
                <th className="text-right px-4 py-2.5 font-normal">BIKES</th>
                <th className="text-left px-4 py-2.5 font-normal">FEED</th>
                <th className="text-left px-4 py-2.5 font-normal">LAST UPDATE</th>
                {quality && (
                  <>
                    <th className="text-center px-3 py-2.5 font-normal" title="Live data reachable">LIVE</th>
                    <th className="text-center px-3 py-2.5 font-normal" title="VELORA-collected history">HIST</th>
                    <th className="text-left px-4 py-2.5 font-normal">COVERAGE</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {systems.map((s) => {
                const l = byId.get(s.id);
                const since = firstById.get(s.id);
                return (
                  <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                    <td className="px-4 py-2">
                      <Link href={`/systems/${encodeURIComponent(s.id)}`} className="hover:text-ok transition-colors">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-[#8b93a7]">{s.city ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-[#8b93a7]">{s.country ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{s.stationCount ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs text-ok">{l?.bikesAvailable ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono ${s.feedStatus === "LIVE" ? "text-ok" : s.feedStatus === "ERROR" ? "text-danger" : "text-[#5b6274]"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full bg-current ${s.feedStatus === "LIVE" ? "live-dot" : ""}`} />
                        {s.feedStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[10px] text-[#5b6274]">{l ? timeAgo(new Date(l.ts)) : "—"}</td>
                    {quality && (
                      <>
                        <td className={`px-3 py-2 text-center ${dot(s.feedStatus === "LIVE")}`}>●</td>
                        <td className={`px-3 py-2 text-center ${dot(!!since)}`}>●</td>
                        <td className="px-4 py-2 font-mono text-[10px] text-[#5b6274]">
                          {since ? `${new Date(since).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} → today` : "none"}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[10px] font-mono text-[#5b6274]">
          Showing first {PAGE_SIZE} — GBFS feeds provide real-time status only. History is built by VELORA's own collection.
        </div>
      </div>
    </main>
  );
}
