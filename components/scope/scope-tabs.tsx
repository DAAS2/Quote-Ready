"use client";

import { Camera, CircleCheck, TriangleAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { titleCase } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { EvidenceRow } from "@/lib/data/types";
import type { ScopePack } from "@/lib/ai/schemas";

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
    out.push([
      label,
      typeof value === "string"
        ? titleCaseValue(value)
        : Array.isArray(value)
          ? value.map((v) => titleCaseValue(String(v))).join(", ")
          : String(value),
    ]);
  }
  return out;
}

export function ScopeTabs({
  scope,
  evidence,
  imagePaths,
}: {
  scope: ScopePack;
  evidence: EvidenceRow[];
  imagePaths: string[];
}) {
  const known = factLabels(scope);
  const missing = scope.missing_fields;
  const customerAsks = missing.filter((m) => m.ask_customer);
  const onSite = missing.filter((m) => !m.ask_customer);

  return (
    <Tabs defaultValue="known" className="min-w-0">
      <TabsList
        variant="line"
        className="h-auto w-full min-w-0 justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {[
          { key: "known", label: `Known details`, count: known.length },
          { key: "missing", label: "Missing", count: missing.length },
          { key: "evidence", label: "Evidence", count: evidence.length },
          { key: "assumptions", label: "Assumptions", count: scope.assumptions.length + scope.exclusions.length },
        ].map((t) => (
          <TabsTrigger
            key={t.key}
            value={t.key}
            className="relative shrink-0 whitespace-nowrap rounded-none border-0 px-3.5 py-2.5 text-[13px] font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground aria-selected:text-foreground"
          >
            {t.label}
            <span className="ml-1.5 font-mono text-[11px] tabular-nums text-muted-foreground/70">
              {t.count}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* ── known ── */}
      <TabsContent value="known" className="mt-5">
        {known.length === 0 ? (
          <p className="text-sm text-muted-foreground">No details established yet.</p>
        ) : (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {known.map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-3 rounded-md bg-secondary/40 px-3 py-2 sm:justify-start sm:bg-transparent sm:px-0"
              >
                <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
                <dd className="text-sm font-medium text-right">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {Object.entries(scope.known_facts)
          .filter(([k]) => k.startsWith("note_"))
          .map(([k, v]) => (
            <p key={k} className="mt-3 flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <CircleCheck className="mt-0.5 size-3 shrink-0 text-success" aria-hidden />
              {String(v)}
            </p>
          ))}
      </TabsContent>

      {/* ── missing ── */}
      <TabsContent value="missing" className="mt-5">
        {missing.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <CircleCheck className="size-4" aria-hidden />
            Nothing missing — all required details are established.
          </p>
        ) : (
          <ul className="space-y-3">
            {[...customerAsks, ...onSite].map((m) => (
              <li key={m.key} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                <span
                  className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", m.critical ? "bg-safety" : "bg-warning")}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {m.label}
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-4.5 px-1.5 text-[10px] font-normal",
                        m.critical ? "border-safety/30 text-safety" : "border-border text-muted-foreground",
                      )}
                    >
                      {m.critical ? "Critical" : m.ask_customer ? "Ask customer" : "On site"}
                    </Badge>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{m.why}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      {/* ── evidence ── */}
      <TabsContent value="evidence" className="mt-5">
        <div className="space-y-4">
          {imagePaths.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imagePaths.map((src, i) => (
                <div key={src} className="group relative size-20 overflow-hidden rounded-md border bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Customer photo ${i + 1} for this job`}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-background/85 px-1 font-mono text-[10px] text-muted-foreground">
                    image_{i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
          <EvidenceList items={evidence} />
        </div>
      </TabsContent>

      {/* ── assumptions & exclusions ── */}
      <TabsContent value="assumptions" className="mt-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Assumptions
            </p>
            <ul className="space-y-2">
              {scope.assumptions.map((a) => (
                <li key={a} className="flex items-start gap-2 rounded-md bg-success/[0.04] p-2.5 text-sm leading-snug">
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
            <ul className="space-y-2">
              {scope.exclusions.map((a) => (
                <li key={a} className="flex items-start gap-2 rounded-md bg-secondary/50 p-2.5 text-sm leading-snug">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function PhotoStrip({ imagePaths }: { imagePaths: string[] }) {
  if (imagePaths.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {imagePaths.map((src, i) => (
        <div key={src} className="relative size-16 overflow-hidden rounded-md border bg-secondary">
          <Camera className="absolute inset-0 m-auto size-4 text-muted-foreground" aria-hidden />
        </div>
      ))}
    </div>
  );
}
