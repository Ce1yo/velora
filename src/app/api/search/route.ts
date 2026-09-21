import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ systems: [], stations: [], cities: [] });

  const [systems, stations] = await Promise.all([
    prisma.system.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { city: { contains: q } },
          { id: { contains: q } },
          { operator: { contains: q } },
        ],
      },
      take: 8,
      orderBy: { stationCount: "desc" },
      select: { id: true, name: true, city: true, country: true, feedStatus: true, stationCount: true },
    }),
    prisma.station.findMany({
      where: { name: { contains: q } },
      take: 8,
      select: { id: true, name: true, systemId: true },
    }),
  ]);

  const cities = [...new Set(systems.map((s) => s.city).filter(Boolean))].slice(0, 5);
  return NextResponse.json({ systems, stations, cities });
}
