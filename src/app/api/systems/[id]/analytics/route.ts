import { NextRequest, NextResponse } from "next/server";
import { availabilityByHour, availabilityHeatmap, stationTurnover } from "@/lib/metrics";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "7", 10) || 7, 90);
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 3600 * 1000);

  const [byHour, heatmap, turnover, coverage] = await Promise.all([
    availabilityByHour(id, from, to),
    availabilityHeatmap(id, from, to),
    stationTurnover(id, from, to),
    prisma.systemSnapshot.findFirst({ where: { systemId: id }, orderBy: { ts: "asc" }, select: { ts: true } }),
  ]);

  return NextResponse.json({
    days,
    byHour,
    heatmap,
    mostActive: turnover,
    collectedSince: coverage?.ts ?? null,
    note: "Activity metrics are estimated from station inventory changes collected by VELORA. They are not trip counts.",
  });
}
