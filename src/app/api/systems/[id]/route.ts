import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const system = await prisma.system.findUnique({ where: { id } });
  if (!system) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [latest, first, stationCount, tripCount] = await Promise.all([
    prisma.systemSnapshot.findFirst({ where: { systemId: id }, orderBy: { ts: "desc" } }),
    prisma.systemSnapshot.findFirst({ where: { systemId: id }, orderBy: { ts: "asc" }, select: { ts: true } }),
    prisma.station.count({ where: { systemId: id } }),
    prisma.trip.count({ where: { systemId: id } }),
  ]);

  return NextResponse.json({
    ...system,
    vehicleTypes: system.vehicleTypesJson ? JSON.parse(system.vehicleTypesJson) : [],
    stationCount: stationCount || system.stationCount,
    latest,
    historySince: first?.ts ?? null,
    tripCount,
  });
}
