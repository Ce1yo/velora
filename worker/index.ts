// Snapshot worker: polls every enabled system's GBFS station_status feed on a
// fixed interval and persists snapshots — this is how VELORA builds its own
// historical record.
import { prisma } from "../src/lib/db";
import { collectAll, pruneOldSnapshots } from "../src/lib/collect";

const intervalS = parseInt(process.env.COLLECT_INTERVAL_SECONDS ?? "120", 10);
const PRUNE_EVERY = 50; // cycles

let running = false;
let cycle = 0;

async function tick() {
  if (running) return;
  running = true;
  cycle++;
  const t0 = Date.now();
  try {
    const { ok, failed } = await collectAll();
    console.log(`[${new Date().toISOString()}] collected ${ok} systems (${failed} failed) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (cycle % PRUNE_EVERY === 0) {
      const pruned = await pruneOldSnapshots(30);
      if (pruned) console.log(`  pruned ${pruned} raw snapshots older than 30d`);
    }
  } catch (e) {
    console.error("collect error:", e);
  } finally {
    running = false;
  }
}

async function main() {
  const enabled = await prisma.system.count({ where: { enabled: true } });
  console.log(`VELORA worker — ${enabled} enabled systems, interval ${intervalS}s`);
  await tick();
  setInterval(tick, intervalS * 1000);
}

main();
