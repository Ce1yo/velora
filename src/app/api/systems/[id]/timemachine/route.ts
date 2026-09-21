import { NextRequest, NextResponse } from "next/server";
import { stationStatesAt } from "@/lib/metrics";
import { availabilityColor } from "@/lib/format";

export const dynamic = "force-dynamic";

// Station states at a given instant — powers the Time Machine.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const atParam = req.nextUrl.searchParams.get("at");
  const at = atParam ? new Date(atParam) : new Date();
  if (Number.isNaN(at.getTime())) return NextResponse.json({ error: "invalid 'at'" }, { status: 400 });

  const rows = await stationStatesAt(id, at);
  const fc = {
    type: "FeatureCollection" as const,
    features: rows.map(({ station, snap }) => {
      const bikes = snap?.bikesAvailable ?? 0;
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [station.lon, station.lat] },
        properties: {
          id: station.id,
          name: station.name,
          capacity: station.capacity,
          bikes,
          docks: snap?.docksAvailable ?? null,
          color: snap ? availabilityColor(bikes, station.capacity) : "#2a3345",
          hasData: snap ? 1 : 0,
        },
      };
    }),
  };
  return NextResponse.json({ at: at.toISOString(), geojson: fc });
}
