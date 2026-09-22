import { prisma } from "./db";
import {
  fetchDiscovery,
  fetchStationInformation,
  fetchStationStatus,
  fetchSystemInformation,
  fetchVehicleTypes,
  electricTypeIds,
  type DiscoveryResult,
  type NormalizedStationStatus,
} from "./gbfs";

const ELECTRIC_PROPULSION = new Set(["electric", "electric_assist"]);

async function log(systemId: string, kind: string, ok: boolean, durationMs: number, extra: { stationCount?: number; error?: string } = {}) {
  try {
    await prisma.collectionLog.create({
      data: { systemId, kind, ok, durationMs, stationCount: extra.stationCount ?? null, error: extra.error ?? null },
    });
  } catch {}
}

async function markError(systemId: string, error: string) {
  try {
    await prisma.system.update({
      where: { id: systemId },
      data: { feedStatus: "ERROR", feedError: error.slice(0, 500), lastCheckedAt: new Date() },
    });
  } catch {}
}

/**
 * Fetch the discovery doc + static feeds (system_information, station_information,
 * vehicle_types) and one station_status to seed coordinates and current counts.
 * Used both for first-time enrichment and periodic station refresh.
 */
export async function enrichSystem(systemId: string): Promise<{ ok: boolean; stationCount: number }> {
  const started = Date.now();
  const system = await prisma.system.findUnique({ where: { id: systemId } });
  if (!system) return { ok: false, stationCount: 0 };

  try {
    const discovery = await fetchDiscovery(system.gbfsUrl);
    const [sysInfo, stationInfo, vehicleTypes] = await Promise.all([
      fetchSystemInformation(discovery),
      fetchStationInformation(discovery),
      fetchVehicleTypes(discovery),
    ]);

    if (stationInfo.length) {
      await prisma.$transaction(
        stationInfo.map((s) =>
          prisma.station.upsert({
            where: { id: `${systemId}:${s.stationId}` },
            create: {
              id: `${systemId}:${s.stationId}`,
              systemId,
              stationId: s.stationId,
              name: s.name,
              lat: s.lat,
              lon: s.lon,
              capacity: s.capacity,
              regionId: s.regionId,
            },
            update: { name: s.name, lat: s.lat, lon: s.lon, capacity: s.capacity, regionId: s.regionId },
          })
        )
      );
    }

    const lat = stationInfo.length ? stationInfo.reduce((a, s) => a + s.lat, 0) / stationInfo.length : null;
    const lon = stationInfo.length ? stationInfo.reduce((a, s) => a + s.lon, 0) / stationInfo.length : null;
    const hasEbikes = vehicleTypes.some((t) => ELECTRIC_PROPULSION.has(t.propulsionType));

    await prisma.system.update({
      where: { id: systemId },
      data: {
        name: sysInfo?.name || system.name,
        operator: sysInfo?.operator ?? system.operator,
        timezone: sysInfo?.timezone ?? system.timezone,
        language: sysInfo?.language ?? system.language,
        gbfsVersion: discovery.version,
        url: sysInfo?.url ?? system.url,
        lat,
        lon,
        stationCount: stationInfo.length || null,
        vehicleTypesJson: vehicleTypes.length ? JSON.stringify(vehicleTypes) : null,
        hasEbikes,
        feedStatus: "LIVE",
        feedError: null,
        lastCheckedAt: new Date(),
      },
    });

    await log(systemId, "ENRICH", true, Date.now() - started, { stationCount: stationInfo.length });
    return { ok: true, stationCount: stationInfo.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markError(systemId, msg);
    await log(systemId, "ENRICH", false, Date.now() - started, { error: msg });
    return { ok: false, stationCount: 0 };
  }
}

async function ensureStations(systemId: string): Promise<number> {
  const count = await prisma.station.count({ where: { systemId } });
  if (count > 0) return count;
  const r = await enrichSystem(systemId);
  return r.stationCount;
}

/** Collect one station_status snapshot for a system. */
export async function collectStatus(systemId: string): Promise<{ ok: boolean; stations: number }> {
  const started = Date.now();
  const system = await prisma.system.findUnique({ where: { id: systemId } });
  if (!system) return { ok: false, stations: 0 };

  try {
    const known = await ensureStations(systemId);
    if (!known) return { ok: false, stations: 0 };

    const discovery = await fetchDiscovery(system.gbfsUrl);
    const electricIds = electricTypeIds(await fetchVehicleTypes(discovery));
    let { ts, stations } = await fetchStationStatus(discovery, electricIds);
    if (!stations.length) throw new Error("station_status returned 0 stations");

    // Station sets drift over time — keep only station_ids we know,
    // and re-pull station_information if the drift is significant.
    let knownIds = new Set(
      (await prisma.station.findMany({ where: { systemId }, select: { stationId: true } })).map((s) => s.stationId)
    );
    let missing = stations.filter((s) => !knownIds.has(s.stationId)).length;
    if (missing > Math.max(5, stations.length * 0.02)) {
      await enrichSystem(systemId);
      knownIds = new Set(
        (await prisma.station.findMany({ where: { systemId }, select: { stationId: true } })).map((s) => s.stationId)
      );
      missing = stations.filter((s) => !knownIds.has(s.stationId)).length;
    }
    stations = stations.filter((s) => knownIds.has(s.stationId));
    if (!stations.length) throw new Error("no station_status rows match known stations");

    await prisma.stationSnapshot.createMany({
      data: stations.map((s: NormalizedStationStatus) => ({
        stationId: `${systemId}:${s.stationId}`,
        systemId,
        ts,
        bikesAvailable: s.bikesAvailable,
        docksAvailable: s.docksAvailable,
        ebikesAvailable: s.ebikesAvailable,
        isRenting: s.isRenting,
        isReturning: s.isReturning,
        isInstalled: s.isInstalled,
      })),
    });

    const bikes = stations.reduce((a, s) => a + s.bikesAvailable, 0);
    const docks = stations.reduce((a, s) => a + s.docksAvailable, 0);
    const ebikes = stations.every((s) => s.ebikesAvailable != null)
      ? stations.reduce((a, s) => a + (s.ebikesAvailable ?? 0), 0)
      : stations.reduce((a, s) => a + (s.ebikesAvailable ?? 0), 0) || null;
    const empty = stations.filter((s) => s.isInstalled && s.isRenting && s.bikesAvailable === 0).length;
    const full = stations.filter((s) => s.isInstalled && s.isReturning && s.docksAvailable === 0).length;
    const disabled = stations.filter((s) => !s.isInstalled || !s.isRenting).length;

    await prisma.systemSnapshot.create({
      data: {
        systemId,
        ts,
        stationCount: stations.length,
        bikesAvailable: bikes,
        docksAvailable: docks,
        ebikesAvailable: ebikes,
        emptyStations: empty,
        fullStations: full,
        disabledStations: disabled,
        availability: bikes + docks > 0 ? bikes / (bikes + docks) : 0,
      },
    });

    await prisma.system.update({
      where: { id: systemId },
      data: {
        feedStatus: "LIVE",
        feedError: null,
        lastCheckedAt: new Date(),
        lastCollectedAt: ts,
        stationCount: stations.length,
      },
    });

    await log(systemId, "STATUS", true, Date.now() - started, { stationCount: stations.length });
    return { ok: true, stations: stations.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markError(systemId, msg);
    await log(systemId, "STATUS", false, Date.now() - started, { error: msg });
    return { ok: false, stations: 0 };
  }
}

/** Collect status for all enabled systems, bounded concurrency. */
export async function collectAll(concurrency = 4): Promise<{ ok: number; failed: number }> {
  const systems = await prisma.system.findMany({ where: { enabled: true }, select: { id: true } });
  let ok = 0;
  let failed = 0;
  const queue = [...systems];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        const s = queue.shift()!;
        const r = await collectStatus(s.id);
        if (r.ok) ok++;
        else failed++;
      }
    })
  );
  return { ok, failed };
}

/** Retention: drop raw station snapshots older than `days`. */
export async function pruneOldSnapshots(days = 30): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  const r = await prisma.stationSnapshot.deleteMany({ where: { ts: { lt: cutoff } } });
  return r.count;
}
