import Link from "next/link";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data sources — VELORA" };

export default async function SourcesPage() {
  const systems = await prisma.system.findMany({
    where: { OR: [{ enabled: true }, { lat: { not: null } }] },
    orderBy: [{ enabled: "desc" }, { stationCount: "desc" }],
    take: 150,
  });
  const lastLogs = await prisma.collectionLog.groupBy({
    by: ["systemId"],
    _max: { ts: true },
  });
  const lastById = new Map(lastLogs.map((l) => [l.systemId, l._max.ts]));

  return (
    <main className="pt-14 min-h-screen">
      <div className="px-4 sm:px-8 py-8">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[#5b6274] mb-2">OPEN DATA · GBFS</div>
        <h1 className="text-3xl font-semibold tracking-tight">Data sources</h1>
        <p className="text-sm text-[#8b93a7] mt-1 max-w-2xl">
          VELORA reads public{" "}
          <a href="https://gbfs.org" target="_blank" rel="noreferrer" className="underline decoration-white/20 hover:text-white">GBFS</a>{" "}
          feeds listed in the{" "}
          <a href="https://github.com/MobilityData/gbfs" target="_blank" rel="noreferrer" className="underline decoration-white/20 hover:text-white">MobilityData catalog</a>.
          Feeds provide real-time status; history is built from VELORA's own periodic collection.
          Each feed remains under its operator's own license.
        </p>

        <div className="mt-6 rounded-lg border border-white/[0.07] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="text-[9px] font-mono tracking-[0.2em] text-[#5b6274] border-b border-white/[0.07]">
                <th className="text-left px-4 py-2.5 font-normal">SYSTEM</th>
                <th className="text-left px-4 py-2.5 font-normal">CITY</th>
                <th className="text-left px-4 py-2.5 font-normal">OPERATOR</th>
                <th className="text-left px-4 py-2.5 font-normal">GBFS FEED</th>
                <th className="text-left px-4 py-2.5 font-normal">COLLECTION</th>
                <th className="text-left px-4 py-2.5 font-normal">LAST FETCH</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                  <td className="px-4 py-2"><Link className="hover:text-ok" href={`/systems/${encodeURIComponent(s.id)}`}>{s.name}</Link></td>
                  <td className="px-4 py-2 text-[#8b93a7]">{s.city ?? "—"}</td>
                  <td className="px-4 py-2 text-[#8b93a7] text-xs">{s.operator ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-[10px] max-w-[280px] truncate">
                    <a href={s.gbfsUrl} target="_blank" rel="noreferrer" className="text-info/80 hover:text-info">{s.gbfsUrl}</a>
                  </td>
                  <td className="px-4 py-2 text-[10px] font-mono">
                    {s.enabled ? <span className="text-ok">every 2 min</span> : <span className="text-[#5b6274]">on demand</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-[10px] text-[#5b6274]">{lastById.get(s.id) ? timeAgo(lastById.get(s.id)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
