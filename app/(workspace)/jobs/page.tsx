import type { Metadata } from "next";
import { store, ensureSeeded } from "@/lib/data/jobs";
import { TriageDashboard } from "@/components/triage/triage-dashboard";
import { toTriageRow } from "@/lib/ui/triage";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  await ensureSeeded();
  const jobs = await store.listJobs();
  const active = jobs.filter((j) => j.status !== "closed");
  const rows = active.map(toTriageRow);

  const needsInfo = rows.filter(
    (r) => r.statusLabel === "Needs information" || r.statusLabel === "Attention required",
  ).length;
  const inspection = rows.filter((r) => r.statusLabel === "Inspection recommended").length;
  const ready = rows.filter((r) => r.statusLabel === "Ready for estimate").length;

  return (
    <TriageDashboard
      greeting=""
      rows={rows}
      counts={{ needsInfo, inspection, ready }}
      totalActive={active.length}
      voiceJobId={rows[0]?.id ?? null}
      variant="jobs"
    />
  );
}
