import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const station = await prisma.station.findUnique({ where: { id } });
  if (!station) return NextResponse.json({ error: "not found" }, { status: 404 });
  const latest = await prisma.stationSnapshot.findFirst({
    where: { stationId: id },
    orderBy: { ts: "desc" },
  });
  const first = await prisma.stationSnapshot.findFirst({
    where: { stationId: id },
    orderBy: { ts: "asc" },
    select: { ts: true },
  });
  return NextResponse.json({ ...station, latest, historySince: first?.ts ?? null });
}
