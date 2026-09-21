# VELORA

Explore shared bikes around the world — live availability, stations and mobility
patterns built on open GBFS data, with history collected by VELORA itself.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind
- **MapLibre GL JS** — CARTO Dark Matter basemap
- **Prisma + SQLite** (dev) — schema is Postgres-compatible for Supabase later
- Custom SVG charts (no generic chart lib)

## Run

```bash
npm install          # also runs prisma generate
cp .env.example .env # fill DATABASE_URL + DIRECT_URL (Supabase)
npx prisma db push   # create schema on Postgres

npm run dev          # web app → http://localhost:3000
npm run worker       # snapshot collector (every COLLECT_INTERVAL_SECONDS, default 120s)
```

## Deploy (Vercel)

1. Create a Supabase project → Settings → Database → copy the **pooler (6543)**
   URI into `DATABASE_URL` and the **session (5432)** URI into `DIRECT_URL`.
2. Set env vars in Vercel: `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET`.
3. Deploy — `postinstall` runs `prisma generate`; run `npx prisma db push`
   locally once against the same DB to create tables, then
   `npm run import:catalog && npm run enrich`.
4. Collection cron: GitHub Actions workflow `.github/workflows/collect.yml`
   runs every 5 min — add repo secrets `APP_URL` and `CRON_SECRET`.
   Alternative: cron-job.org hitting `GET /api/collect?secret=<CRON_SECRET>`.

## Data pipeline

```bash
npm run import:catalog      # pull MobilityData systems.csv → ~1500 systems
npm run enrich              # fetch GBFS discovery+station_information for
                            # priority cities → centroid, counts, vehicle types
npm run enrich -- --all     # same, but for every catalog system (slow)
npm run collect             # one station_status snapshot round for enabled systems
```

A system is **enriched** once (coordinates, station list, capacity) and
**enabled** for continuous snapshot polling. Enabled today: Vélo'v (Lyon),
Vélib' (Paris), Citi Bike (NYC), BIXI (Montréal), Citiz Lyon, Dott Lyon,
Vélibéo. Toggle in DB or extend `DEMO_SYSTEM_IDS`/`PRIORITY_CITIES` in
`src/lib/catalog.ts`.

## Honesty rules baked in

- GBFS = real-time only. All historical charts come from `station_snapshots` /
  `system_snapshots` collected by VELORA ("Historical data collected by VELORA").
- Station inventory deltas are labelled "estimated turnover", never "trips".
- Trip analytics render only when a public trip dataset is imported (`Trip` table).

## Env

| var | default | purpose |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Prisma datasource |
| `COLLECT_INTERVAL_SECONDS` | `120` | worker poll interval |

## API

`GET /api/overview` · `/api/world` · `/api/systems` · `/api/systems/:id` ·
`/api/systems/:id/stations` · `/api/systems/:id/geojson` ·
`/api/systems/:id/history?range=` · `/api/systems/:id/analytics?days=` ·
`/api/systems/:id/timemachine?at=` · `/api/systems/:id/trips` ·
`/api/stations/:id` · `/api/stations/:id/history` · `/api/cities` ·
`/api/search?q=` · `/api/export/:system?format=csv|json` · `POST /api/collect`

## Layout

```
prisma/schema.prisma    models
src/lib/gbfs.ts         GBFS v2/v3 client + normalization
src/lib/collect.ts      enrichment + snapshot collection + retention
src/lib/metrics.ts      history/analytics queries
src/lib/catalog.ts      systems.csv parsing + priority lists
scripts/                import-catalog, enrich-systems, db-check, fix-demo-systems
worker/                 index.ts (loop), collect-once.ts
src/app/                pages + api routes
src/components/         map/ (MapLibre), charts/ (SVG), system/ (tabs)
```
