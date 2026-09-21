import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const systems = await prisma.system.findMany({
    where: { lat: { not: null } },
    select: { id: true, name: true, city: true, country: true, lat: true, lon: true, stationCount: true, feedStatus: true },
    orderBy: { stationCount: "desc" },
  });
  const byCity = new Map<string, { city: string; country: string | null; systems: typeof systems; lat: number; lon: number; stations: number }>();
  for (const s of systems) {
    const key = (s.city ?? s.name).trim();
    const cur = byCity.get(key);
    if (!cur) {
      byCity.set(key, { city: key, country: s.country, systems: [s], lat: s.lat!, lon: s.lon!, stations: s.stationCount ?? 0 });
    } else {
      cur.systems.push(s);
      cur.stations += s.stationCount ?? 0;
    }
  }
  return NextResponse.json([...byCity.values()]);
}
