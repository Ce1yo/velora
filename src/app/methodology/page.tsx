export const metadata = { title: "Methodology — VELORA" };

const SECTIONS: [string, string[]][] = [
  [
    "What GBFS provides",
    [
      "GBFS (General Bikeshare Feed Specification) is the open standard used by shared-mobility operators to publish real-time system data: stations, capacity, vehicles available, docks available, vehicle types and status flags.",
      "GBFS provides the current status of a system. It does not provide user trips, and it does not provide history.",
    ],
  ],
  [
    "How VELORA builds history",
    [
      "A worker collects station_status snapshots from each enabled system's public feed every few minutes and stores them in VELORA's own database.",
      "All historical charts on this site are computed exclusively from snapshots collected by VELORA, or from clearly-labelled public historical datasets. Coverage begins the day collection started — VELORA never claims history it did not collect.",
    ],
  ],
  [
    "Availability & activity metrics",
    [
      "Availability rate = bikes available ÷ (bikes + docks available) across reporting stations.",
      "'Estimated turnover' and 'estimated activity' measure changes in station inventory between consecutive snapshots. A change can come from riders, operator rebalancing, maintenance, or data corrections — inventory changes are never presented as trips.",
      "Empty station = reporting station with 0 bikes available. Full station = 0 docks available.",
    ],
  ],
  [
    "Trips",
    [
      "Trip statistics exist only where an operator or city publishes a public, anonymized, trip-level dataset. VELORA imports such datasets, normalizes them and aggregates them.",
      "Origin/destination flows are always aggregated — never individual journeys.",
    ],
  ],
  [
    "Electric bikes",
    [
      "E-bike counts are shown only when the feed's vehicle_types + vehicle_types_available fields allow identifying them per station. Otherwise the metric is displayed as 'n/a'.",
    ],
  ],
  [
    "Privacy",
    [
      "VELORA collects no personal data. Only public system-level GBFS data is stored. Nothing on this site identifies individual users or reconstructs individual journeys.",
    ],
  ],
  [
    "Data quality",
    [
      "Each system page shows its feed status, last update time and the start of VELORA's collected coverage. Systems marked 'on demand' are fetched when visited; 'enabled' systems are polled continuously.",
    ],
  ],
];

export default function MethodologyPage() {
  return (
    <main className="pt-14 min-h-screen">
      <div className="px-4 sm:px-8 py-8 max-w-3xl">
        <div className="text-[10px] font-mono tracking-[0.3em] text-[#5b6274] mb-2">METHODOLOGY</div>
        <h1 className="text-3xl font-semibold tracking-tight">How VELORA works</h1>
        <p className="text-sm text-[#8b93a7] mt-2">
          VELORA explores shared-bike systems from open data — and is explicit about what the data does and does not say.
        </p>
        <div className="mt-8 space-y-8">
          {SECTIONS.map(([title, paras]) => (
            <section key={title}>
              <h2 className="text-sm font-mono tracking-[0.2em] text-ok mb-3 uppercase">{title}</h2>
              <div className="space-y-2">
                {paras.map((p, i) => (
                  <p key={i} className="text-sm text-[#b6bccb] leading-relaxed">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-12 rounded-lg border border-white/[0.08] bg-white/[0.02] p-5 text-xs font-mono text-[#8b93a7] leading-relaxed">
          GBFS reference: gbfs.org/documentation/reference — Catalog: github.com/MobilityData/gbfs
        </div>
      </div>
    </main>
  );
}
