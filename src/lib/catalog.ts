// Shared catalog helpers — CSV parsing for the MobilityData systems feed
// and the curated priority list used for eager enrichment/collection.

export const SYSTEMS_CSV_URL = "https://github.com/MobilityData/gbfs/raw/master/systems.csv";

// Cities enriched eagerly so the world map is meaningful on first run.
// Matched case-insensitively against the catalog "Location" column.
export const PRIORITY_CITIES = new Set(
  [
    "lyon", "paris", "london", "new york", "new york city", "montreal", "montréal",
    "berlin", "barcelona", "madrid", "milan", "milano", "brussels", "bruxelles",
    "toronto", "chicago", "washington", "boston", "san francisco", "mexico city",
    "bordeaux", "marseille", "lille", "nantes", "toulouse", "vienna", "wien",
    "munich", "münchen", "hamburg", "dublin", "oslo", "stockholm", "copenhagen",
    "københavn", "helsinki", "tokyo", "taipei", "sydney", "vancouver", "portland",
    "denver", "los angeles", "miami", "philadelphia", "minneapolis", "calgary",
    "québec", "quebec", "luxembourg", "geneva", "genève", "zurich", "zürich",
    "amsterdam", "rotterdam", "nice", "strasbourg", "rennes", "grenoble",
    "montpellier", "seoul", "rome", "roma", "lisbon", "lisboa", "porto",
    "valencia", "seville", "sevilla", "bilbao", "buenos aires", "santiago",
    "são paulo", "rio de janeiro", "prague", "praha", "budapest", "warsaw",
    "warszawa", "athens", "edinburgh", "glasgow", "manchester", "antwerp",
    "antwerpen", "ghent", "rotterdam", "utrecht", "basel", "lausanne", "bern",
    "malmo", "malmö", "gothenburg", "göteborg", "aarhus", "tampere", "turku",
    "tallinn", "riga", "vilnius", "zagreb", "ljubljana", "bratislava", "krakow",
    "kraków", "gdansk", "gdańsk", "wroclaw", "wrocław", "poznan", "poznań",
    "clermont-ferrand", "dijon", "le havre", "saint-étienne", "reims", "metz",
    "besançon", "orléans", "rouen", "caen", "angers", "brest", "le mans",
    "amiens", "limoges", "perpignan", "mulhouse", "nancy", "aix-en-provence",
  ].map((c) => c.toLowerCase())
);

// A small set of flagship systems polled continuously for the live demo.
export const DEMO_SYSTEM_IDS = new Set([
  "lyon",     // Vélo'v — Lyon
  "Paris",    // Vélib' Métropole — Paris
  "lyft_nyc", // Citi Bike — New York
  "Bixi_MTL", // BIXI — Montréal
]);

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export const DEMO_SYSTEM_MATCHERS = ["velo'v", "velib", "santander", "citi bike", "citibike", "bixi"];

export function isPriorityCity(location: string | null | undefined): boolean {
  if (!location) return false;
  const loc = stripAccents(location.trim());
  for (const c of PRIORITY_CITIES) {
    const cc = stripAccents(c);
    if (loc === cc || loc.startsWith(cc + ",") || loc.startsWith(cc + " ")) return true;
  }
  return false;
}

export function isDemoSystem(systemId: string, name: string): boolean {
  if (DEMO_SYSTEM_IDS.has(systemId)) return true;
  const hay = stripAccents(`${systemId} ${name}`);
  return DEMO_SYSTEM_MATCHERS.some((m) => hay.includes(stripAccents(m)));
}

// Minimal RFC-4180-ish CSV parser (handles quoted fields with commas/quotes).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f !== "")) rows.push(row);
  }
  return rows;
}
