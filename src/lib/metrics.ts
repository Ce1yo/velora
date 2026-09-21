import { prisma } from "./db";

export interface HistoryPoint {
  ts: string;
  bikes: number;
  docks: number;
  ebikes: number | null;
  emptyStations: number;
  fullStations: number;
  availability: number;
  stationCount: number;
}

/**
 * System-level history from SystemSnapshot, bucketed to keep payloads small.
 * `bucket` = minutes per bucket (avg within bucket).
 */
export async function systemHistory(
  systemId: string,
  from: Date,
  to: Date,
  bucketMinutes = 30
): Promise<HistoryPoint[]> {
  const rows = await prisma.systemSnapshot.findMany({
    where: { systemId, ts: { gte: from, lte: to } },
    orderBy: { ts: "asc" },
  });
  if (!rows.length) return [];
  const buckets = new Map<number, typeof rows>();
  const span = bucketMinutes * 60_000;
  for (const r of rows) {
    const k = Math.floor(r.ts.getTime() / span) * span;
    const arr = buckets.get(k) ?? [];
    arr.push(r);
    buckets.set(k, arr);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, arr]) => ({
      ts: new Date(k).toISOString(),
      bikes: avg(arr.map((r) => r.bikesAvailable)),
      docks: avg(arr.map((r) => r.docksAvailable)),
      ebikes: arr.every((r) => r.ebikesAvailable == null)
        ? null
        : avg(arr.map((r) => r.ebikesAvailable ?? 0)),
      emptyStations: avg(arr.map((r) => r.emptyStations)),
      fullStations: avg(arr.map((r) => r.fullStations)),
      availability: avg(arr.map((r) => r.availability)),
      stationCount: Math.round(avg(arr.map((r) => r.stationCount))),
    }));
}

export async function stationHistory(stationPk: string, from: Date, to: Date) {
  const rows = await prisma.stationSnapshot.findMany({
    where: { stationId: stationPk, ts: { gte: from, lte: to } },
    orderBy: { ts: "asc" },
    take: 2000,
  });
  return rows.map((r) => ({
    ts: r.ts.toISOString(),
    bikes: r.bikesAvailable,
    docks: r.docksAvailable,
    ebikes: r.ebikesAvailable,
    renting: r.isRenting,
  }));
}

/** Average bikes available per hour-of-day (0-23). */
export async function availabilityByHour(systemId: string, from: Date, to: Date) {
  const rows = await prisma.systemSnapshot.findMany({
    where: { systemId, ts: { gte: from, lte: to } },
    select: { ts: true, bikesAvailable: true, availability: true },
  });
  const acc: { sum: number; n: number }[] = Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }));
  const accAvail: { sum: number; n: number }[] = Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }));
  for (const r of rows) {
    const h = r.ts.getHours();
    acc[h].sum += r.bikesAvailable;
    acc[h].n++;
    accAvail[h].sum += r.availability;
    accAvail[h].n++;
  }
  return acc.map((a, h) => ({
    hour: h,
    bikes: a.n ? a.sum / a.n : null,
    availability: accAvail[h].n ? accAvail[h].sum / accAvail[h].n : null,
  }));
}

/** Day-of-week (0=Sun) × hour heatmap of average availability ratio. */
export async function availabilityHeatmap(systemId: string, from: Date, to: Date) {
  const rows = await prisma.systemSnapshot.findMany({
    where: { systemId, ts: { gte: from, lte: to } },
    select: { ts: true, availability: true },
  });
  const grid: { sum: number; n: number }[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }))
  );
  for (const r of rows) {
    const cell = grid[r.ts.getDay()][r.ts.getHours()];
    cell.sum += r.availability;
    cell.n++;
  }
  return grid.map((row, day) =>
    row.map((c, hour) => ({ day, hour, value: c.n ? c.sum / c.n : null }))
  );
}

/**
 * Estimated station activity: sum of |Δ bikes| between consecutive snapshots
 * divided by 2. This is inventory turnover, NOT trip count.
 */
export async function stationTurnover(systemId: string, from: Date, to: Date, limit = 15) {
  const stations = await prisma.station.findMany({
    where: { systemId },
    select: { id: true, stationId: true, name: true, capacity: true },
  });
  const results: { stationId: string; name: string; capacity: number | null; turnover: number; emptyEvents: number; fullEvents: number }[] = [];
  for (const st of stations) {
    const snaps = await prisma.stationSnapshot.findMany({
      where: { stationId: st.id, ts: { gte: from, lte: to } },
      orderBy: { ts: "asc" },
      select: { bikesAvailable: true, docksAvailable: true, isInstalled: true },
      take: 1500,
    });
    if (snaps.length < 2) continue;
    let delta = 0;
    let emptyEvents = 0;
    let fullEvents = 0;
    const cap = st.capacity ?? null;
    for (let i = 1; i < snaps.length; i++) {
      delta += Math.abs(snaps[i].bikesAvailable - snaps[i - 1].bikesAvailable);
      if (snaps[i].bikesAvailable === 0 && snaps[i - 1].bikesAvailable > 0) emptyEvents++;
      if (cap && snaps[i].docksAvailable === 0 && snaps[i - 1].docksAvailable > 0) fullEvents++;
    }
    results.push({
      stationId: st.stationId,
      name: st.name,
      capacity: st.capacity,
      turnover: Math.round(delta / 2),
      emptyEvents,
      fullEvents,
    });
  }
  results.sort((a, b) => b.turnover - a.turnover);
  return results.slice(0, limit);
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

/** Latest snapshot per station for a system (for maps). */
export async function latestStationStates(systemId: string) {
  const stations = await prisma.station.findMany({ where: { systemId } });
  if (!stations.length) return [];
  // Latest ts for the system
  const latest = await prisma.stationSnapshot.findFirst({
    where: { systemId },
    orderBy: { ts: "desc" },
    select: { ts: true },
  });
  if (!latest) return stations.map((s) => ({ ...s, status: null }));
  const snaps = await prisma.stationSnapshot.findMany({
    where: { systemId, ts: latest.ts },
  });
  const byId = new Map(snaps.map((s) => [s.stationId, s]));
  return stations.map((s) => ({ ...s, status: byId.get(s.id) ?? null, ts: latest.ts }));
}

/** Snapshots of all stations at/just before a given instant (time machine). */
export async function stationStatesAt(systemId: string, at: Date, windowMinutes = 30) {
  const stations = await prisma.station.findMany({ where: { systemId } });
  const out: { station: (typeof stations)[number]; snap: { bikesAvailable: number; docksAvailable: number; ts: Date } | null }[] = [];
  const lower = new Date(at.getTime() - windowMinutes * 60_000);
  const rows = await prisma.stationSnapshot.findMany({
    where: { systemId, ts: { gte: lower, lte: at } },
    orderBy: { ts: "asc" },
  });
  const byStation = new Map<string, (typeof rows)[number]>();
  for (const r of rows) byStation.set(r.stationId, r); // keep latest within window
  for (const st of stations) {
    const s = byStation.get(st.id);
    out.push({ station: st, snap: s ? { bikesAvailable: s.bikesAvailable, docksAvailable: s.docksAvailable, ts: s.ts } : null });
  }
  return out;
}
