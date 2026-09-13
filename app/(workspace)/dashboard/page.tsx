import type { Metadata } from "next";
import { store, ensureSeeded } from "@/lib/data/jobs";
import { getServerProfile } from "@/lib/data/org";
import { TriageDashboard } from "@/components/triage/triage-dashboard";
import { toTriageRow } from "@/lib/ui/triage";

export const metadata: Metadata = { title: "Triage dashboard" };
export const dynamic = "force-dynamic";

function greetingFor(date: Date, name?: string | null): string {
  const h = date.getHours();
  const period = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${period}, ${name}` : period;
}

export default async function DashboardPage() {
  await ensureSeeded();
  const [jobs, profile] = await Promise.all([
    store.listJobs(),
    getServerProfile().catch(() => null),
  ]);
  const active = jobs.filter((j) => j.status !== "closed");
  const rows = active.map(toTriageRow);

  const needsInfo = rows.filter(
    (r) => r.statusLabel === "Needs information" || r.statusLabel === "Attention required",
  ).length;
  const inspection = rows.filter((r) => r.statusLabel === "Inspection recommended").length;
  const ready = rows.filter((r) => r.statusLabel === "Ready for estimate").length;

  const voiceJobId = rows[0]?.id ?? null;

  // Signed-in users see their own name; anonymous visitors get the demo persona.
  const profileName = profile?.full_name?.trim().split(/\s+/)[0] || null;
  const firstName = profile ? profileName : "Alex";
  const region = profile
    ? profile.service_area?.trim() || null
    : "Melbourne Metro";

  return (
    <TriageDashboard
      greeting={greetingFor(new Date(), firstName)}
      region={region}
      rows={rows}
      counts={{ needsInfo, inspection, ready }}
      totalActive={active.length}
      voiceJobId={voiceJobId}
      emptyState={Boolean(profile)}
    />
  );
}
