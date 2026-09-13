import type { Metadata } from "next";
import { TemplatesManager } from "@/components/templates/templates-manager";
import { store, ensureSeeded } from "@/lib/data/jobs";

export const metadata: Metadata = { title: "Intake checklist & templates" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  await ensureSeeded();
  const { new: isNew } = await searchParams;
  const templates = await store.listTemplates().catch(() => []);
  return <TemplatesManager initialTemplates={templates} autoNew={isNew === "1"} />;
}
