import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { store } from "@/lib/data/jobs";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jobs = await store.listJobs();
  const jobsCount = jobs.filter((j) => j.status !== "closed").length;
  const messagesCount = jobs.filter((j) => j.status === "follow_up_drafted").length;

  return (
    <WorkspaceShell jobsCount={jobsCount} messagesCount={messagesCount}>
      {children}
    </WorkspaceShell>
  );
}
