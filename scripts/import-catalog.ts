// Import the MobilityData GBFS systems catalog into the database.
// https://github.com/MobilityData/gbfs/blob/master/systems.csv
// Batched inserts — sequential upserts are too slow over WAN links.
import { prisma } from "../src/lib/db";
import { SYSTEMS_CSV_URL, parseCsv, isPriorityCity, isDemoSystem } from "../src/lib/catalog";

async function main() {
  console.log("Fetching GBFS systems catalog…");
  const res = await fetch(SYSTEMS_CSV_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const rows = parseCsv(text);
  const header = rows.shift() ?? [];
  const idx = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const col = {
    country: idx("country code"),
    name: idx("name"),
    location: idx("location"),
    id: idx("system id"),
    url: idx("url"),
    autoDiscovery: idx("auto-discovery url"),
    version: idx("gbfs version"),
  };
  if (col.id < 0 || col.autoDiscovery < 0) throw new Error("Unexpected systems.csv header");

  const records = rows
    .map((r) => {
      const id = r[col.id]?.trim();
      const gbfsUrl = r[col.autoDiscovery]?.trim();
      if (!id || !gbfsUrl || !gbfsUrl.startsWith("http")) return null;
      const name = r[col.name]?.trim() || id;
      return {
        id,
        name,
        city: r[col.location]?.trim() || null,
        country: r[col.country]?.trim() || null,
        url: r[col.url]?.trim() || null,
        gbfsUrl,
        gbfsVersion: r[col.version]?.trim() || null,
        priority: isDemoSystem(id, name) ? 100 : isPriorityCity(r[col.location]) ? 50 : 0,
        enabled: isDemoSystem(id, name),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  const existing = new Set(
    (await prisma.system.findMany({ select: { id: true } })).map((s) => s.id)
  );
  const fresh = records.filter((r) => !existing.has(r.id));

  const CHUNK = 500;
  let created = 0;
  for (let i = 0; i < fresh.length; i += CHUNK) {
    await prisma.system.createMany({ data: fresh.slice(i, i + CHUNK), skipDuplicates: true });
    created += Math.min(CHUNK, fresh.length - i);
    console.log(`  inserted ${created}/${fresh.length}`);
  }

  // Keep priority/enabled fresh for demo + priority systems (cheap targeted updates).
  const demo = records.filter((r) => r.priority === 100).map((r) => r.id);
  const prio = records.filter((r) => r.priority === 50).map((r) => r.id);
  if (demo.length)
    await prisma.system.updateMany({ where: { id: { in: demo } }, data: { priority: 100, enabled: true } });
  if (prio.length)
    await prisma.system.updateMany({ where: { id: { in: prio }, priority: { lt: 100 } }, data: { priority: 50 } });

  console.log(`Catalog import done. ${created} created, ${records.length - created} already existed.`);
  const total = await prisma.system.count();
  const enabled = await prisma.system.count({ where: { enabled: true } });
  console.log(`Total systems: ${total} — enabled for live collection: ${enabled}`);
}

main().finally(() => prisma.$disconnect());
