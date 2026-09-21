import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SystemView } from "@/components/system/SystemView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await prisma.system.findUnique({ where: { id } });
  if (!s) return {};
  return {
    title: `${s.name} — ${s.city ?? ""} | VELORA`,
    description: `Live availability and history for ${s.name} in ${s.city ?? "unknown city"}.`,
  };
}

export default async function SystemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const system = await prisma.system.findUnique({ where: { id } });
  if (!system) notFound();
  const [latest, first] = await Promise.all([
    prisma.systemSnapshot.findFirst({ where: { systemId: id }, orderBy: { ts: "desc" } }),
    prisma.systemSnapshot.findFirst({ where: { systemId: id }, orderBy: { ts: "asc" }, select: { ts: true } }),
  ]);
  return <SystemView system={{ ...system, latest, historySince: first?.ts ?? null }} />;
}
