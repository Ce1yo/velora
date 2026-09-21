// Import the MobilityData GBFS systems catalog into the database.
// https://github.com/MobilityData/gbfs/blob/master/systems.csv
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
  if (col.id < 0 || col.autoDiscovery < 0) {
    console.error("Header:", header);
    throw new Error("Unexpected systems.csv header");
  }

  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const id = r[col.id]?.trim();
    const gbfsUrl = r[col.autoDiscovery]?.trim();
    if (!id || !gbfsUrl || !gbfsUrl.startsWith("http")) continue;
    const name = r[col.name]?.trim() || id;
    const location = r[col.location]?.trim() || null;
    const country = r[col.country]?.trim() || null;
    const url = r[col.url]?.trim() || null;
    const version = r[col.version]?.trim() || null;
    const priority = isDemoSystem(id, name) ? 100 : isPriorityCity(location) ? 50 : 0;
    const enabled = isDemoSystem(id, name);
    const existing = await prisma.system.findUnique({ where: { id } });
    if (existing) {
      await prisma.system.update({
        where: { id },
        data: { name, city: location, country, url, gbfsUrl, gbfsVersion: version, priority: Math.max(existing.priority, priority), enabled: existing.enabled || enabled },
      });
      updated++;
    } else {
      await prisma.system.create({
        data: { id, name, city: location, country, url, gbfsUrl, gbfsVersion: version, priority, enabled },
      });
      created++;
    }
  }
  console.log(`Catalog import done. ${created} created, ${updated} updated.`);
  const total = await prisma.system.count();
  const enabled = await prisma.system.count({ where: { enabled: true } });
  console.log(`Total systems: ${total} — enabled for live collection: ${enabled}`);
}

main().finally(() => prisma.$disconnect());
