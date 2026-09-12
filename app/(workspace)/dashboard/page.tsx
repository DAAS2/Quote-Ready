import type { Metadata } from "next";
import { ensureSeeded, store } from "@/lib/data/jobs";
import { JobsWorkspace } from "@/components/dashboard/jobs-workspace";
import { JobStatusEnum } from "@/lib/ai/schemas";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureSeeded();
  const jobs = await store.listJobs();
  const params = await searchParams;

  const statusParam = typeof params.status === "string" ? params.status : "all";
  const status = JobStatusEnum.safeParse(statusParam).success
    ? (statusParam as "all")
    : "all";
  const q = typeof params.q === "string" ? params.q : "";

  return (
    <JobsWorkspace jobs={jobs} status={status as never} q={q} />
  );
}
