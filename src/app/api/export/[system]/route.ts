import { NextRequest, NextResponse } from "next/server";
import { latestStationStates } from "@/lib/metrics";

export const dynamic = "force-dynamic";

// Export current station states as CSV or JSON.
export async function GET(req: NextRequest, { params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "csv";
  const rows = await latestStationStates(system);

  if (format === "json") {
    return NextResponse.json({
      system,
      exportedAt: new Date().toISOString(),
      source: "VELORA — collected from public GBFS feed",
      stations: rows.map((r) => ({
        station_id: r.stationId,
        name: r.name,
        lat: r.lat,
        lon: r.lon,
        capacity: r.capacity,
        bikes_available: r.status?.bikesAvailable ?? null,
        docks_available: r.status?.docksAvailable ?? null,
        ebikes_available: r.status?.ebikesAvailable ?? null,
        ts: r.status?.ts ?? null,
      })),
    });
  }

  const header = "station_id,name,lat,lon,capacity,bikes_available,docks_available,ebikes_available,ts";
  const csv = [
    header,
    ...rows.map((r) =>
      [
        r.stationId,
        `"${r.name.replace(/"/g, '""')}"`,
        r.lat,
        r.lon,
        r.capacity ?? "",
        r.status?.bikesAvailable ?? "",
        r.status?.docksAvailable ?? "",
        r.status?.ebikesAvailable ?? "",
        r.status?.ts ? new Date(r.status.ts).toISOString() : "",
      ].join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="velora_${system}_stations.csv"`,
    },
  });
}
