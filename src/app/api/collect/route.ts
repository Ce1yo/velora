import { NextRequest, NextResponse } from "next/server";
import { collectStatus, collectAll, enrichSystem } from "@/lib/collect";

export const dynamic = "force-dynamic";

// Manual collection trigger (local/dev convenience).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.system) {
    await enrichSystem(body.system);
    const r = await collectStatus(body.system);
    return NextResponse.json(r);
  }
  const r = await collectAll();
  return NextResponse.json(r);
}
