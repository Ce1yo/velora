import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Trip statistics — only when a public historical trip dataset has been imported.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const count = await prisma.trip.count({ where: { systemId: id } });
  if (!count) {
    return NextResponse.json({
      available: false,
      count: 0,
      note: "No public trip dataset imported for this system. VELORA never infers trips from inventory changes.",
    });
  }
  const [avgDuration, hours] = await Promise.all([
    prisma.trip.aggregate({ where: { systemId: id }, _avg: { durationS: true } }),
    prisma.trip.findMany({ where: { systemId: id }, select: { startTime: true }, take: 50000 }),
  ]);
  const bucket = new Map<number, number>();
  for (const t of hours) {
    const h = t.startTime.getHours();
    bucket.set(h, (bucket.get(h) ?? 0) + 1);
  }
  const byHour = [...bucket.entries()].sort((a, b) => a[0] - b[0]).map(([h, n]) => ({ h, n }));
  return NextResponse.json({
    available: true,
    count,
    avgDurationS: avgDuration._avg.durationS,
    byHour,
    note: "Trips come from public, aggregated, anonymized datasets.",
  });
}
