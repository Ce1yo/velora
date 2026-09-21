import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [systems, mapped, enabled, live, stations, cities, countries] = await Promise.all([
    prisma.system.count(),
    prisma.system.count({ where: { lat: { not: null } } }),
    prisma.system.count({ where: { enabled: true } }),
    prisma.system.count({ where: { feedStatus: "LIVE" } }),
    prisma.station.count(),
    prisma.system.findMany({ where: { lat: { not: null }, city: { not: null } }, select: { city: true }, distinct: ["city"] }),
    prisma.system.findMany({ where: { lat: { not: null }, country: { not: null } }, select: { country: true }, distinct: ["country"] }),
  ]);

  const bikesRows = await prisma.$queryRaw<{ bikes: bigint | number | null }[]>`
    SELECT COALESCE(SUM(s."bikesAvailable"), 0) AS bikes
    FROM "SystemSnapshot" s
    INNER JOIN (SELECT "systemId", MAX("ts") AS m FROM "SystemSnapshot" GROUP BY "systemId") t
      ON s."systemId" = t."systemId" AND s."ts" = t.m
  `;
  const bikes = Number(bikesRows[0]?.bikes ?? 0);

  return NextResponse.json({
    systems,
    systemsMapped: mapped,
    systemsEnabled: enabled,
    systemsLive: live,
    stations,
    cities: cities.length,
    countries: countries.length,
    bikesAvailable: bikes,
  });
}
