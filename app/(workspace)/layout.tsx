import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { store, ensureSeeded } from "@/lib/data/jobs";
import { getServerProfile } from "@/lib/data/org";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureSeeded();
  const [jobs, alerts, profile] = await Promise.all([
    store.listJobs(),
    store.listRecentAuditFeed(12).catch(() => []),
    getServerProfile().catch(() => null),
  ]);

  const jobsCount = jobs.filter((j) => j.status !== "closed").length;
  const messagesCount = jobs.filter((j) => j.status === "follow_up_drafted").length;

  // Signed-in users see their own identity; anonymous visitors get the demo org.
  const isDemo = !profile;
  const businessName =
    profile?.business_name?.trim() || (isDemo ? "Northside Plumbing" : "My workspace");
  const operatorName =
    profile?.full_name?.trim() ||
    (isDemo ? "Alex Miller" : (profile?.email?.split("@")[0] ?? "You"));

  return (
    <WorkspaceShell
      jobsCount={jobsCount}
      messagesCount={messagesCount}
      alerts={alerts.map((a) => ({
        id: a.id,
        job_id: a.job_id,
        job_name: a.job_name,
        actor_type: a.actor_type,
        event_type: a.event_type,
        summary: a.summary,
        created_at: a.created_at,
      }))}
      businessName={businessName}
      operatorName={operatorName}
      email={profile?.email ?? null}
      isDemo={isDemo}
      serviceArea={profile?.service_area?.trim() || null}
    >
      {children}
    </WorkspaceShell>
  );
}
