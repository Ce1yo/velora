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
  const [avgDuration, byHour] = await Promise.all([
    prisma.trip.aggregate({ where: { systemId: id }, _avg: { durationS: true } }),
    prisma.$queryRaw<{ h: number; n: number }[]>`
      SELECT CAST(strftime('%H', startTime) AS INTEGER) AS h, COUNT(*) AS n
      FROM Trip WHERE systemId = ${id} GROUP BY h ORDER BY h
    `,
  ]);
  return NextResponse.json({
    available: true,
    count,
    avgDurationS: avgDuration._avg.durationS,
    byHour,
    note: "Trips come from public, aggregated, anonymized datasets.",
  });
}
