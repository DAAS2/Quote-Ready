import type { Metadata } from "next";
import { ensureSeeded, store } from "@/lib/data/jobs";
import { JobsWorkspace } from "@/components/dashboard/jobs-workspace";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await ensureSeeded();
  const jobs = await store.listJobs();

  return <JobsWorkspace jobs={jobs} />;
}