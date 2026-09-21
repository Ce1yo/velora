import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trips — VELORA" };

export default async function TripsPage() {
  const systems = await prisma.system.findMany({
    where: { enabled: true },
    select: { id: true, name: true, city: true, _count: { select: { trips: true } } },
  });
  const withTrips = systems.filter((s) => s._count.trips > 0);

  return (
    <main className="pt-14 min-h-screen">
      <div className="px-4 sm:px-8 py-8 max-w-4xl">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[#5b6274] mb-2">TRIP DATA</div>
        <h1 className="text-3xl font-semibold tracking-tight">Trips</h1>
        <p className="text-sm text-[#8b93a7] mt-2 leading-relaxed">
          GBFS feeds describe the <em className="text-[#c8cdd9] not-italic">current state</em> of a system —
          they do not publish user trips. VELORA only shows trip analytics when an operator or city
          publishes a public, anonymized historical trip dataset. Changes in station inventory are
          never presented as trips.
        </p>

        {withTrips.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-white/15 p-10 text-center">
            <div className="text-[10px] font-mono tracking-[0.3em] text-[#5b6274] mb-3">NO PUBLIC TRIP DATASET IMPORTED YET</div>
            <p className="text-sm text-[#8b93a7] max-w-lg mx-auto leading-relaxed">
              Some cities (e.g. New York Citi Bike, Montréal BIXI, London) publish anonymized
              trip-level open data. When such a dataset is imported, this page shows trip volumes,
              durations, origin/destination flows and peak patterns — aggregated only.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-white/[0.07] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02]">
                <tr className="text-[9px] font-mono tracking-[0.2em] text-[#5b6274] border-b border-white/[0.07]">
                  <th className="text-left px-4 py-2.5 font-normal">SYSTEM</th>
                  <th className="text-left px-4 py-2.5 font-normal">CITY</th>
                  <th className="text-right px-4 py-2.5 font-normal">TRIPS IMPORTED</th>
                </tr>
              </thead>
              <tbody>
                {withTrips.map((s) => (
                  <tr key={s.id} className="border-b border-white/[0.04]">
                    <td className="px-4 py-2"><Link className="hover:text-ok" href={`/systems/${encodeURIComponent(s.id)}`}>{s.name}</Link></td>
                    <td className="px-4 py-2 text-[#8b93a7]">{s.city}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{formatNumber(s._count.trips)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-[10px] font-mono text-[#5b6274] leading-relaxed">
          {systems.map((s) => (
            <div key={s.id}>{s.name} — {s._count.trips ? `${formatNumber(s._count.trips)} trips` : "no public trip dataset"}</div>
          ))}
        </div>
      </div>
    </main>
  );
}
