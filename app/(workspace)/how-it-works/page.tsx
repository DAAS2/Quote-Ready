import type { Metadata } from "next";
import { Bot, Workflow } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPONENT_WEIGHTS } from "@/lib/rules/readiness";

export const metadata: Metadata = { title: "How it works" };

const STEPS = [
  { name: "validate_job_input", does: "Rejects empty/short enquiries before any model call", actor: "rules" },
  { name: "extract_job_facts_with_gemini", does: "Reads text + photos → structured facts with per-claim sources", actor: "gemini" },
  { name: "validate_structured_output", does: "Zod-validates every field; malformed output never reaches the UI", actor: "rules" },
  { name: "apply_job_template_rules_and_score", does: "Trade templates + weighted readiness + risk/inspection overrides", actor: "rules" },
  { name: "persist_analysis", does: "Scope version + evidence + audit event saved to the job timeline", actor: "system" },
] as const;

const DIVISION = [
  ["Interpreting messy customer text", "AI", "Gemini extracts facts with evidence sources"],
  ["Reading photos as visual evidence", "AI", "Low/medium certainty labels — never decisive"],
  ["Transcribing spoken site notes", "AI", "ElevenLabs Scribe speech-to-text"],
  ["Drafting customer follow-up copy", "AI", "From rule-selected missing fields only"],
  ["Deciding what a job needs to be quotable", "Rules", "Per-type required-field templates"],
  ["Scoring readiness 0–100", "Rules", "Transparent weighted formula (below)"],
  ["Routing inspection / safety escalation", "Rules", "Deterministic overrides; safety patterns on raw text"],
  ["Approving anything sent to customers", "Human", "Drafts require explicit operator approval"],
  ["Setting prices", "Human", "QuoteReady never prices a job"],
] as const;

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Workflow className="size-5 text-primary" aria-hidden />
          How QuoteReady works
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          AI interprets unstructured input. Deterministic rules decide readiness and routing.
          Humans approve every customer-facing action.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Analysis pipeline (LangGraph)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.name} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
                    s.actor === "gemini"
                      ? "bg-primary/10 text-primary"
                      : s.actor === "rules"
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-mono text-xs font-semibold">{s.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.does}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            The readiness formula
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-md bg-secondary/60 px-3 py-2 font-mono text-xs">
            readiness = 0.25·Details + 0.25·Evidence + 0.20·Access + 0.15·Confirmation + 0.15·Risk
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(COMPONENT_WEIGHTS).map(([k, w]) => (
              <span key={k} className="rounded-full border px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                {k}: ×{w}
              </span>
            ))}
          </div>
          <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li>· Any missing critical field caps the score at 69.</li>
            <li>· Inspection conditions or safety patterns cap the score at 69 and re-route the recommendation.</li>
            <li>· Bands: 0–39 needs information · 40–69 inspection recommended · 70–100 ready for estimate.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Bot className="size-3.5" aria-hidden />
            What AI does vs what rules do
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Task</TableHead>
                <TableHead className="w-20">Owner</TableHead>
                <TableHead>How</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DIVISION.map(([task, owner, how]) => (
                <TableRow key={task}>
                  <TableCell className="text-xs">{task}</TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-[10px] font-semibold uppercase ${
                        owner === "AI" ? "text-primary" : owner === "Human" ? "text-warning" : "text-success"
                      }`}
                    >
                      {owner}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{how}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Safety boundary: QuoteReady provides an AI-assisted scope-readiness assessment based on
        supplied information. It does not diagnose faults, guarantee pricing, or replace
        professional on-site assessment. Urgent safety concerns require appropriate
        professional/emergency action.
      </p>
    </div>
  );
}
