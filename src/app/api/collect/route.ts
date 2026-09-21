import { NextRequest, NextResponse } from "next/server";
import { collectStatus, collectAll, enrichSystem } from "@/lib/collect";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby max

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // local dev: open
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

// Collection trigger — called by cron (GitHub Actions / cron-job.org / Vercel cron).
export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.system) {
    await enrichSystem(body.system);
    const r = await collectStatus(body.system);
    return NextResponse.json(r);
  }
  const r = await collectAll();
  return NextResponse.json(r);
}

// Allow GET for cron services that only support GET.
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await collectAll();
  return NextResponse.json(r);
}
