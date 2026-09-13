import { notFound } from "next/navigation";
import { store } from "@/lib/data/jobs";
import { AnalysingView } from "@/components/jobs/analysing-view";
import { JOB_TYPE_LABELS } from "@/lib/rules/job-templates";
import { displayRef } from "@/lib/ui/triage";
import { titleCase } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AnalysingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await store.getJob(id);
  if (!job) notFound();

  const photoClaims = job.evidence
    .filter((e) => e.type === "photo_observation")
    .map((e) => e.claim);

  const templateRow = job.template_id
    ? await store.getTemplate(job.template_id).catch(() => null)
    : null;

  return (
    <AnalysingView
      jobId={job.id}
      queueRef={`#${displayRef(job.id, "QR")}`}
      enquiryRef={displayRef(job.id, "ENQ")}
      customerName={job.customer.full_name}
      jobTypeLabel={templateRow?.name ?? JOB_TYPE_LABELS[job.job_type]}
      photoPaths={job.image_paths}
      photoClaims={photoClaims}
      urgencyLabel={titleCase(job.scope?.facts.urgency ?? "standard")}
    />
  );
}
