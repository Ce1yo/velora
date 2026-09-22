// Enrich systems: fetch each GBFS discovery + station_information once to
// derive centroid coordinates, station counts and vehicle types.
// Usage: tsx scripts/enrich-systems.ts [--all] [--limit N] [--priority]
import { prisma } from "../src/lib/db";
import { enrichSystem, collectStatus } from "../src/lib/collect";

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const force = args.includes("--force");
  const limIdx = args.indexOf("--limit");
  const limit = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) : 120;

  // Incremental by default: skip systems already enriched (have coordinates).
  const base = force ? {} : { lat: null };
  const where = all ? base : { ...base, OR: [{ priority: { gt: 0 } }, { enabled: true }] };
  const systems = await prisma.system.findMany({
    where,
    orderBy: { priority: "desc" },
    take: limit,
    select: { id: true, name: true, city: true, enabled: true },
  });
  console.log(`Enriching ${systems.length} systems…`);
  let ok = 0;
  let failed = 0;
  const queue = [...systems];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (queue.length) {
        const s = queue.shift()!;
        const r = await enrichSystem(s.id);
        if (r.ok) {
          ok++;
          // Also grab a one-off status snapshot so the world map has real counts.
          await collectStatus(s.id).catch(() => {});
          console.log(`  ✓ ${s.name} (${s.city ?? "?"}) — ${r.stationCount} stations`);
        } else {
          failed++;
          console.log(`  ✗ ${s.name} (${s.city ?? "?"})`);
        }
      }
    })
  );
  console.log(`Done. ${ok} enriched, ${failed} failed.`);
}

main().finally(() => prisma.$disconnect());
