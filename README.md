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

## Deploy (Vercel + Supabase)

1. Create a Supabase project → Settings → Database → Connection string.
   Copy the **Transaction pooler** URI (port 6543) and the **Session** URI
   (port 5432) — both are IPv4-reachable pooler endpoints.
2. GitHub repo → Settings → Secrets and variables → Actions, add:
   `DATABASE_URL` (pooler 6543 URI), `DIRECT_URL` (session 5432 URI),
   `CRON_SECRET` (random string), `APP_URL` (your Vercel URL).
3. GitHub → Actions → **Provision database** → Run workflow
   (creates tables, imports the GBFS catalog, enriches priority systems).
4. Vercel → Settings → Environment Variables: `DATABASE_URL`, `DIRECT_URL`,
   `CRON_SECRET` → redeploy.
5. Collection runs via `.github/workflows/collect.yml` every 5 min.
   Alternative: cron-job.org → `GET <APP_URL>/api/collect?secret=<CRON_SECRET>`.

Note: local dev needs outbound access to Postgres ports 5432/6543 — if the
network blocks them (corporate firewall), run everything through GitHub
Actions + Vercel, or use a connection that allows those ports.

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
