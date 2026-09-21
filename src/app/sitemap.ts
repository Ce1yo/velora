import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const systems = await prisma.system.findMany({
    where: { lat: { not: null } },
    select: { id: true },
    take: 500,
  });
  return [
    { url: base, changeFrequency: "always" },
    { url: `${base}/systems`, changeFrequency: "hourly" },
    { url: `${base}/compare`, changeFrequency: "hourly" },
    { url: `${base}/trips`, changeFrequency: "daily" },
    { url: `${base}/sources`, changeFrequency: "daily" },
    { url: `${base}/methodology`, changeFrequency: "monthly" },
    ...systems.map((s) => ({
      url: `${base}/systems/${encodeURIComponent(s.id)}`,
      changeFrequency: "always" as const,
    })),
  ];
}
