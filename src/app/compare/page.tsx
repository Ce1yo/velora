import { prisma } from "@/lib/db";
import { CompareView } from "@/components/CompareView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compare cities — VELORA" };

export default async function ComparePage() {
  // Only systems that actually have collected data are comparable.
  const systems = await prisma.system.findMany({
    where: { snapshots: { some: {} } },
    select: { id: true, name: true, city: true, country: true, stationCount: true },
    orderBy: { stationCount: "desc" },
    take: 100,
  });
  return (
    <main className="pt-14 min-h-screen">
      <div className="px-4 sm:px-8 py-8">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[#5b6274] mb-2">WORLD COMPARISON</div>
        <h1 className="text-3xl font-semibold tracking-tight">Compare cities</h1>
        <p className="text-sm text-[#8b93a7] mt-1 max-w-xl">
          Only comparable indicators are shown — "n/a" where a system does not
          report the metric. Rankings are per-metric, never a global score.
        </p>
        <CompareView systems={systems} />
      </div>
    </main>
  );
}
