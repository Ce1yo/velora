import { prisma } from "../src/lib/db";
import { enrichSystem, collectStatus } from "../src/lib/collect";

async function main() {
  await prisma.system.updateMany({ where: { id: { in: ["Paris", "lyft_nyc"] } }, data: { enabled: true, priority: 100 } });
  await prisma.system.update({ where: { id: "getaround_lyon" }, data: { enabled: false } }).catch(() => {});
  // Re-enrich systems whose name was mangled by v3 localized fields.
  const bad = await prisma.system.findMany({ where: { name: { contains: "[object" } }, select: { id: true } });
  const targets = ["Paris", "lyft_nyc", ...bad.map((b) => b.id)];
  for (const id of targets) {
    const e = await enrichSystem(id);
    await collectStatus(id).catch(() => {});
    console.log(id, e.ok ? `ok (${e.stationCount} stations)` : "failed");
  }
  const enabled = await prisma.system.findMany({ where: { enabled: true }, select: { id: true, name: true } });
  console.log("enabled:", enabled.map((s) => `${s.id}=${s.name}`).join(" | "));
}

main().finally(() => prisma.$disconnect());
