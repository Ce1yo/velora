import { NextResponse } from "next/server";
import { latestStationStates } from "@/lib/metrics";
import { availabilityColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await latestStationStates(id);
  const fc = {
    type: "FeatureCollection" as const,
    features: rows.map((r) => {
      const bikes = r.status?.bikesAvailable ?? 0;
      const color = availabilityColor(bikes, r.capacity);
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] },
        properties: {
          id: r.id,
          name: r.name,
          capacity: r.capacity,
          bikes,
          docks: r.status?.docksAvailable ?? null,
          ebikes: r.status?.ebikesAvailable ?? null,
          color,
          empty: bikes === 0 ? 1 : 0,
          ts: r.status?.ts?.toISOString?.() ?? null,
        },
      };
    }),
  };
  return NextResponse.json(fc);
}
