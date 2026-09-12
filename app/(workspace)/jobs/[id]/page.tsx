import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, CircleCheck, TriangleAlert } from "lucide-react";
import { store } from "@/lib/data/jobs";
import { JOB_TYPE_LABELS } from "@/lib/rules/job-templates";
import { titleCase } from "@/lib/utils/format";
import { relativeTime } from "@/lib/utils/format";
import { StatusBadge, JobTypeBadge } from "@/components/shared/status-badge";
import { BandExplainer, ReadinessMeter, bandTone } from "@/components/shared/readiness-meter";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { AuditTimeline } from "@/components/scope/audit-timeline";
import { AnalysePanel } from "@/components/jobs/analyse-panel";
import { ActionButtons } from "@/components/scope/action-buttons";
import { DraftsList } from "@/components/scope/drafts-list";
import { VersionHistory } from "@/components/scope/version-history";
import { VoiceNotePanel } from "@/components/voice/voice-note-panel";
import { BriefingPlayer } from "@/components/voice/briefing-player";
import { JudgeStrip } from "@/components/shared/judge-strip";
import { Suspense } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ScopePack } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await store.getJob(id);
  return { title: job ? `${job.customer.full_name} — ${JOB_TYPE_LABELS[job.job_type]}` : "Job" };
}

export default async function JobDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await store.getJob(id);
  if (!job) notFound();

  const scope = job.scope;
  const knownLabels = scope ? factLabels(scope) : [];

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60 rounded"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All jobs
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{job.customer.full_name}</h1>
            {job.customer.suburb && (
              <span className="text-sm text-muted-foreground">{job.customer.suburb}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <JobTypeBadge label={JOB_TYPE_LABELS[job.job_type]} />
            <StatusBadge status={job.status} safetyFlag={job.safety_flag} />
          </div>
        </div>
      </div>

      <JudgeStrip customerName={job.customer.full_name} />

      {job.safety_flag && <SafetyCard />}

      {!scope ? (
        <>
          <AnalysePanel jobId={job.id} />
          {job.enquiry_text && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Original enquiry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{job.enquiry_text}</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* ── readiness summary ── */}
          <ReadinessSummary scope={scope} />
        </>
      )}

      {scope && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* ── left column ── */}
        <div className="space-y-5">
          {scope && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Known details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {knownLabels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No details established yet.</p>
                  ) : (
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
                      {knownLabels.map(([label, value]) => (
                        <div key={label} className="flex items-baseline justify-between gap-3 border-b border-dashed pb-2 last:border-0 sm:justify-start sm:border-0">
                          <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
                          <dd className="text-sm font-medium text-right">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </CardContent>
              </Card>

              <MissingFieldsCard scope={scope} />
            </>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Evidence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.image_paths.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {job.image_paths.map((src, i) => (
                    <div
                      key={src}
                      className="relative size-20 overflow-hidden rounded-md border bg-secondary"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Customer photo ${i + 1} for this job`}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1 right-1 rounded bg-background/80 px-1 font-mono text-[10px] text-muted-foreground">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <EvidenceList items={job.evidence} />
            </CardContent>
          </Card>

          {scope && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Assumptions &amp; exclusions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Assumptions
                  </p>
                  <ul className="space-y-1.5">
                    {scope.assumptions.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-sm leading-snug">
                        <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Not included
                  </p>
                  <ul className="space-y-1.5">
                    {scope.exclusions.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-sm leading-snug">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── right column ── */}
        <div className="space-y-5">
          {scope && (
            <>
              <ActionCard scope={scope} />
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Take action
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ActionButtons
                    jobId={job.id}
                    actionType={scope.recommended_action.type}
                    status={job.status}
                    safetyFlag={job.safety_flag}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Customer drafts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DraftsList drafts={job.drafts} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Voice field notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <VoiceNotePanel jobId={job.id} status={job.status} />
                  {scope && <BriefingPlayer jobId={job.id} />}
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline events={job.audit_events} />
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {scope && job.versions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scope history
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VersionHistory versions={job.versions} />
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground">
        Last updated {relativeTime(job.updated_at)} · Customer-provided information; verify
        before quoting.
      </p>
    </div>
  );
}

/* ── sub-sections ─────────────────────────────────────────────────────────── */

function ReadinessSummary({ scope }: { scope: ScopePack }) {
  const tone = bandTone(scope.readiness_band);
  const components = [
    ["Details", scope.components.details, 25],
    ["Evidence", scope.components.evidence, 25],
    ["Access", scope.components.access, 20],
    ["Confirmation", scope.components.confirmation, 15],
    ["Risk", scope.components.risk, 15],
  ] as const;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="sm:w-72 shrink-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quote readiness
            </p>
            <p className={`font-mono text-2xl font-semibold tabular-nums ${tone.text}`}>
              {scope.readiness_score}%
            </p>
          </div>
          <ReadinessMeter score={scope.readiness_score} band={scope.readiness_band} showLabel={false} className="mt-2" />
          <BandExplainer band={scope.readiness_band} className="mt-3" />
        </div>
        <Separator orientation="vertical" className="hidden sm:block h-24" />
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Score components
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-1 md:grid-cols-2">
            {components.map(([label, value, weight]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${value}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                  {value}
                </span>
                <span className="w-9 shrink-0 text-right font-mono text-[10px] text-muted-foreground/70">
                  ×{weight.toLocaleString(undefined, { style: "percent", minimumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MissingFieldsCard({ scope }: { scope: ScopePack }) {
  const customerAsks = scope.missing_fields.filter((m) => m.ask_customer);
  const onSite = scope.missing_fields.filter((m) => !m.ask_customer);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          Missing information
          <Badge variant="outline" className="font-mono">
            {scope.missing_fields.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {scope.missing_fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing missing — all required details are established.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {[...customerAsks, ...onSite].map((m) => (
              <li key={m.key} className="flex items-start gap-3">
                <span
                  className={`mt-1 size-1.5 shrink-0 rounded-full ${m.critical ? "bg-safety" : "bg-warning"}`}
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium">
                    {m.label}
                    {m.critical && (
                      <Badge variant="outline" className="ml-2 h-4.5 border-safety/30 px-1 text-[10px] font-medium text-safety">
                        Critical
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{m.why}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActionCard({ scope }: { scope: ScopePack }) {
  const action = scope.recommended_action;
  return (
    <Card className={action.type === "safety_escalation" ? "border-safety/40" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recommended next action
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-semibold">{action.title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{action.rationale}</p>
        {scope.risk_flags.length > 0 && (
          <>
            <Separator className="my-3.5" />
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Risk flags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {scope.risk_flags.map((f) => (
                <Badge
                  key={f.id}
                  className={
                    f.severity === "safety"
                      ? "gap-1 bg-safety/10 text-safety border-safety/25"
                      : f.severity === "high"
                        ? "gap-1 bg-warning/10 text-warning border-warning/25"
                        : "gap-1 bg-secondary text-secondary-foreground border-transparent"
                  }
                >
                  <TriangleAlert className="size-3" aria-hidden />
                  {f.label}
                </Badge>
              ))}
            </div>
          </>
        )}
        {scope.override_reasons.length > 0 && (
          <>
            <Separator className="my-3.5" />
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Why this recommendation
            </p>
            <ul className="space-y-1">
              {scope.override_reasons.map((r) => (
                <li key={r} className="text-xs leading-relaxed text-muted-foreground">
                  · {r}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SafetyCard() {
  return (
    <Alert className="border-safety/40 bg-safety/5 text-safety [&>svg]:text-safety">
      <TriangleAlert className="size-4" aria-hidden />
      <AlertTitle>Safety attention required</AlertTitle>
      <AlertDescription className="text-safety/90">
        This enquiry matches urgent safety patterns. Do not use this assessment as a safety
        diagnosis — follow the appropriate professional or emergency process before any work is
        scheduled.
      </AlertDescription>
    </Alert>
  );
}

function factLabels(scope: ScopePack): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(scope.known_facts)) {
    if (key.startsWith("note_")) continue;
    if (key === "photo_count") {
      out.push(["Photos", `${value} attached`]);
      continue;
    }
    if (key === "voice_note_count") {
      out.push(["Voice notes", `${value} recorded`]);
      continue;
    }
    const label = FACT_LABELS[key] ?? titleCase(key);
    out.push([label, typeof value === "string" ? titleCaseValue(value) : String(value)]);
  }
  return out;
}

const FACT_LABELS: Record<string, string> = {
  location_in_property: "Location",
  fixture_type: "Fixture",
  system_type: "System",
  system_age: "System age",
  symptoms: "Symptoms",
  urgency: "Urgency",
  property_access: "Access",
  water_isolation_access: "Isolation",
  water_damage: "Water damage",
  customer_availability: "Availability",
  suburb: "Suburb",
};

function titleCaseValue(v: string): string {
  return v
    .split(/[\s_]+/)
    .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}
