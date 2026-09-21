// GBFS client — supports v2.x and v3.x feeds.
// Reference: https://gbfs.org/documentation/reference/

export interface GbfsFeed {
  name: string;
  url: string;
}

export interface DiscoveryResult {
  version: string;
  ttl: number;
  lastUpdated: Date | null;
  feeds: GbfsFeed[];
}

export interface NormalizedStationInfo {
  stationId: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number | null;
  regionId: string | null;
}

export interface NormalizedStationStatus {
  stationId: string;
  bikesAvailable: number;
  docksAvailable: number;
  ebikesAvailable: number | null; // null when the feed does not break down by type
  isRenting: boolean;
  isReturning: boolean;
  isInstalled: boolean;
}

export interface NormalizedSystemInfo {
  systemId: string;
  name: string;
  language: string | null;
  timezone: string | null;
  operator: string | null;
  url: string | null;
}

export interface NormalizedVehicleType {
  id: string;
  formFactor: string;
  propulsionType: string;
}

const FETCH_TIMEOUT_MS = 20_000;

export async function fetchJson<T = any>(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "VELORA/0.1 (shared-bike analytics; gbfs consumer)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function toDate(v: unknown): Date | null {
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v * 1000);
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function fetchDiscovery(gbfsUrl: string): Promise<DiscoveryResult> {
  const doc = await fetchJson(gbfsUrl);
  const data = doc?.data;
  let rawFeeds: any[] = [];
  // v2/v3: data.feeds — some feeds nest under data.<lang>.feeds (v1 style)
  if (Array.isArray(data?.feeds)) rawFeeds = data.feeds;
  else if (data && typeof data === "object") {
    for (const k of Object.keys(data)) {
      if (Array.isArray(data[k]?.feeds)) {
        rawFeeds = data[k].feeds;
        break;
      }
    }
  }
  const feeds: GbfsFeed[] = rawFeeds
    .filter((f) => f?.url && f?.name)
    .map((f) => ({ name: String(f.name), url: String(f.url) }));
  return {
    version: String(doc?.version ?? data?.version ?? "unknown"),
    ttl: typeof doc?.ttl === "number" ? doc.ttl : 300,
    lastUpdated: toDate(doc?.last_updated),
    feeds,
  };
}

function feedUrl(discovery: DiscoveryResult, ...names: string[]): string | null {
  for (const n of names) {
    const f = discovery.feeds.find((x) => x.name === n);
    if (f) return f.url;
  }
  return null;
}

export async function fetchStationInformation(
  discovery: DiscoveryResult
): Promise<NormalizedStationInfo[]> {
  const url = feedUrl(discovery, "station_information");
  if (!url) return [];
  const doc = await fetchJson(url);
  const stations = doc?.data?.stations;
  if (!Array.isArray(stations)) return [];
  return stations
    .filter((s: any) => s?.station_id != null && typeof s.lat === "number" && typeof s.lon === "number")
    .map((s: any) => ({
      stationId: String(s.station_id),
      name: localized(s.name) ?? String(s.station_id),
      lat: s.lat,
      lon: s.lon,
      capacity: typeof s.capacity === "number" ? s.capacity : null,
      regionId: s.region_id != null ? String(s.region_id) : null,
    }));
}

export async function fetchVehicleTypes(
  discovery: DiscoveryResult
): Promise<NormalizedVehicleType[]> {
  const url = feedUrl(discovery, "vehicle_types");
  if (!url) return [];
  try {
    const doc = await fetchJson(url);
    const types = doc?.data?.vehicle_types;
    if (!Array.isArray(types)) return [];
    return types.map((t: any) => ({
      id: String(t.vehicle_type_id ?? ""),
      formFactor: String(t.form_factor ?? "bicycle").toLowerCase(),
      propulsionType: String(t.propulsion_type ?? "human").toLowerCase(),
    }));
  } catch {
    return [];
  }
}

// GBFS 3.0 made some fields localized arrays: [{text, language}]
function localized(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length) {
    const first = v[0];
    if (first && typeof first === "object" && "text" in first) return String((first as any).text);
    return String(first);
  }
  return null;
}

export async function fetchSystemInformation(
  discovery: DiscoveryResult
): Promise<NormalizedSystemInfo | null> {
  const url = feedUrl(discovery, "system_information");
  if (!url) return null;
  try {
    const doc = await fetchJson(url);
    const d = doc?.data;
    if (!d) return null;
    return {
      systemId: String(d.system_id ?? ""),
      name: localized(d.name) ?? "",
      language: localized(d.language) ?? (typeof d.language === "string" ? d.language : null),
      timezone: d.timezone != null ? String(d.timezone) : null,
      operator: localized(d.operator) ?? (d.operator != null ? String(d.operator) : null),
      url: d.url != null ? String(d.url) : null,
    };
  } catch {
    return null;
  }
}

const ELECTRIC_PROPULSION = new Set(["electric", "electric_assist", "electric_assist_human"]);

export function electricTypeIds(vehicleTypes: NormalizedVehicleType[]): Set<string> {
  return new Set(
    vehicleTypes.filter((t) => ELECTRIC_PROPULSION.has(t.propulsionType)).map((t) => t.id)
  );
}

export async function fetchStationStatus(
  discovery: DiscoveryResult,
  electricIds: Set<string>
): Promise<{ ts: Date; stations: NormalizedStationStatus[] }> {
  const url = feedUrl(discovery, "station_status");
  if (!url) throw new Error("station_status feed not exposed by discovery document");
  const doc = await fetchJson(url);
  const stations = doc?.data?.stations;
  if (!Array.isArray(stations)) throw new Error("station_status payload has no stations array");

  const normalized: NormalizedStationStatus[] = stations
    .filter((s: any) => s?.station_id != null)
    .map((s: any) => {
      const bikes =
        typeof s.num_vehicles_available === "number"
          ? s.num_vehicles_available
          : typeof s.num_bikes_available === "number"
            ? s.num_bikes_available
            : 0;
      const docks = typeof s.num_docks_available === "number" ? s.num_docks_available : 0;
      let ebikes: number | null = null;
      if (Array.isArray(s.vehicle_types_available) && electricIds.size > 0) {
        ebikes = 0;
        for (const vt of s.vehicle_types_available) {
          if (electricIds.has(String(vt?.vehicle_type_id)))
            ebikes += typeof vt?.count === "number" ? vt.count : 0;
        }
      } else if (typeof s.num_ebikes_available === "number") {
        ebikes = s.num_ebikes_available;
      }
      return {
        stationId: String(s.station_id),
        bikesAvailable: bikes,
        docksAvailable: docks,
        ebikesAvailable: ebikes,
        isRenting: s.is_renting !== false && s.is_renting !== 0,
        isReturning: s.is_returning !== false && s.is_returning !== 0,
        isInstalled: s.is_installed !== false && s.is_installed !== 0,
      };
    });

  return { ts: toDate(doc?.last_updated) ?? new Date(), stations: normalized };
}
