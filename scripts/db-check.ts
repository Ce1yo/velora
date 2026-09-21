import { prisma } from "../src/lib/db";

async function main() {
  const enabled = await prisma.system.findMany({
    where: { enabled: true },
    select: { id: true, name: true, city: true, feedStatus: true, stationCount: true, lat: true, lon: true },
  });
  console.log("ENABLED:", JSON.stringify(enabled, null, 1));
  const counts = await prisma.systemSnapshot.groupBy({ by: ["systemId"], _count: true, _max: { ts: true } });
  console.log("SNAPSHOTS:", JSON.stringify(counts));
  const st = await prisma.stationSnapshot.count();
  console.log("stationSnapshots:", st);
}

main().finally(() => prisma.$disconnect());
