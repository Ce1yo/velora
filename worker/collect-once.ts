// Run a single collection round (all enabled systems, or one with --system ID).
import { collectAll, collectStatus, enrichSystem } from "../src/lib/collect";
import { prisma } from "../src/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--system");
  if (idx >= 0) {
    const id = args[idx + 1];
    await enrichSystem(id);
    const r = await collectStatus(id);
    console.log(r);
  } else {
    const r = await collectAll();
    console.log(`ok=${r.ok} failed=${r.failed}`);
  }
}

main().finally(() => prisma.$disconnect());
