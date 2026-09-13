import type { Metadata } from "next";
import { TemplatesManager } from "@/components/templates/templates-manager";
import { store, ensureSeeded } from "@/lib/data/jobs";

export const metadata: Metadata = { title: "Intake checklist & templates" };
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await ensureSeeded();
  const templates = await store.listTemplates().catch(() => []);
  return <TemplatesManager initialTemplates={templates} />;
}
