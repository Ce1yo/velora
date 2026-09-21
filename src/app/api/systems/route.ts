import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const country = req.nextUrl.searchParams.get("country")?.trim();
  const mapped = req.nextUrl.searchParams.get("mapped");
  const take = Math.min(parseInt(req.nextUrl.searchParams.get("take") ?? "500", 10) || 500, 2000);
  const skip = parseInt(req.nextUrl.searchParams.get("skip") ?? "0", 10) || 0;

  const systems = await prisma.system.findMany({
    where: {
      ...(country ? { country } : {}),
      ...(mapped === "1" ? { lat: { not: null } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { id: { contains: q, mode: "insensitive" } },
              { operator: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ priority: "desc" }, { stationCount: "desc" }, { name: "asc" }],
    take,
    skip,
  });

  const latest = await prisma.$queryRaw<{ systemId: string; ts: string; bikesAvailable: number; availability: number }[]>`
    SELECT s."systemId", s."ts", s."bikesAvailable", s."availability"
    FROM "SystemSnapshot" s
    INNER JOIN (SELECT "systemId", MAX("ts") AS m FROM "SystemSnapshot" GROUP BY "systemId") t
      ON s."systemId" = t."systemId" AND s."ts" = t.m
  `;
  const byId = new Map(latest.map((r) => [r.systemId, r]));

  // Historical coverage: earliest collected snapshot per system
  const firsts = await prisma.systemSnapshot.groupBy({ by: ["systemId"], _min: { ts: true } });
  const firstById = new Map(firsts.map((f) => [f.systemId, f._min.ts]));

  const total = await prisma.system.count();

  return NextResponse.json({
    total,
    systems: systems.map((s) => ({
      ...s,
      latest: byId.get(s.id) ?? null,
      historySince: firstById.get(s.id) ?? null,
    })),
  });
}
