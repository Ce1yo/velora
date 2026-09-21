import { NextRequest, NextResponse } from "next/server";
import { systemHistory } from "@/lib/metrics";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const RANGES: Record<string, { days: number; bucket: number }> = {
  "24h": { days: 1, bucket: 5 },
  "7d": { days: 7, bucket: 30 },
  "30d": { days: 30, bucket: 120 },
  "90d": { days: 90, bucket: 360 },
  "1y": { days: 365, bucket: 1440 },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const range = req.nextUrl.searchParams.get("range") ?? "7d";
  const cfg = RANGES[range] ?? RANGES["7d"];
  const to = new Date();
  const from = new Date(to.getTime() - cfg.days * 24 * 3600 * 1000);
  const [points, coverage] = await Promise.all([
    systemHistory(id, from, to, cfg.bucket),
    prisma.systemSnapshot.findFirst({ where: { systemId: id }, orderBy: { ts: "asc" }, select: { ts: true } }),
  ]);
  return NextResponse.json({
    range,
    points,
    collectedSince: coverage?.ts ?? null,
    note: "Historical data collected by VELORA",
  });
}
