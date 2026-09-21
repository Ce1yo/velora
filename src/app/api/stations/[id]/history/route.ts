import { NextRequest, NextResponse } from "next/server";
import { stationHistory } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hours = Math.min(parseInt(req.nextUrl.searchParams.get("hours") ?? "24", 10) || 24, 24 * 30);
  const to = new Date();
  const from = new Date(to.getTime() - hours * 3600 * 1000);
  const points = await stationHistory(id, from, to);
  return NextResponse.json({ points, note: "Historical data collected by VELORA" });
}
