import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lightweight payload for the world map: every system with known coordinates,
// plus its latest aggregated counts.
export async function GET() {
  const systems = await prisma.system.findMany({
    where: { lat: { not: null }, lon: { not: null } },
    select: {
      id: true, name: true, city: true, country: true, lat: true, lon: true,
      stationCount: true, feedStatus: true, lastCollectedAt: true, enabled: true,
    },
    orderBy: { stationCount: "desc" },
  });
  const latest = await prisma.$queryRaw<{ systemId: string; bikesAvailable: number; availability: number }[]>`
    SELECT s.systemId, s.bikesAvailable, s.availability
    FROM SystemSnapshot s
    INNER JOIN (SELECT systemId, MAX(ts) AS m FROM SystemSnapshot GROUP BY systemId) t
      ON s.systemId = t.systemId AND s.ts = t.m
  `;
  const byId = new Map(latest.map((r) => [r.systemId, r]));
  return NextResponse.json(
    systems.map((s) => ({
      ...s,
      bikesAvailable: byId.get(s.id)?.bikesAvailable ?? null,
      availability: byId.get(s.id)?.availability ?? null,
    }))
  );
}
