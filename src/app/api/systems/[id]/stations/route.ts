import { NextResponse } from "next/server";
import { latestStationStates } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await latestStationStates(id);
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      stationId: r.stationId,
      name: r.name,
      lat: r.lat,
      lon: r.lon,
      capacity: r.capacity,
      status: r.status
        ? {
            bikes: r.status.bikesAvailable,
            docks: r.status.docksAvailable,
            ebikes: r.status.ebikesAvailable,
            renting: r.status.isRenting,
            returning: r.status.isReturning,
            installed: r.status.isInstalled,
          }
        : null,
      ts: (r as any).ts ?? null,
    }))
  );
}
