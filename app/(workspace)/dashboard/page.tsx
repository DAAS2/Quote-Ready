import type { Metadata } from "next";
import { store, ensureSeeded } from "@/lib/data/jobs";
import { TriageDashboard } from "@/components/triage/triage-dashboard";
import { toTriageRow } from "@/lib/ui/triage";

export const metadata: Metadata = { title: "Triage dashboard" };
export const dynamic = "force-dynamic";

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning, Alex";
  if (h < 17) return "Good afternoon, Alex";
  return "Good evening, Alex";
}

export default async function DashboardPage() {
  await ensureSeeded();
  const jobs = await store.listJobs();
  const active = jobs.filter((j) => j.status !== "closed");
  const rows = active.map(toTriageRow);

  const needsInfo = rows.filter(
    (r) => r.statusLabel === "Needs information" || r.statusLabel === "Attention required",
  ).length;
  const inspection = rows.filter((r) => r.statusLabel === "Inspection recommended").length;
  const ready = rows.filter((r) => r.statusLabel === "Ready for estimate").length;

  const voiceJobId = rows[0]?.id ?? null;

  return (
    <TriageDashboard
      greeting={greetingFor(new Date())}
      rows={rows}
      counts={{ needsInfo, inspection, ready }}
      totalActive={active.length}
      voiceJobId={voiceJobId}
    />
  );
}
