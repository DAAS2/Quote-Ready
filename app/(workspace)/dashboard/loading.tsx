export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading jobs">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-16 rounded bg-muted" />
          <div className="h-3.5 w-40 rounded bg-muted" />
        </div>
        <div className="h-8 w-24 rounded-md bg-muted" />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="size-4 rounded bg-muted" />
            </div>
            <div className="mt-2 h-7 w-10 rounded bg-muted" />
            <div className="mt-2 h-1 w-full rounded-full bg-muted" />
          </div>
        ))}
      </div>

      {/* search */}
      <div className="h-9 w-full max-w-sm rounded-md bg-muted" />

      {/* table */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <div className="border-b bg-secondary/40 px-4 py-2.5">
          <div className="flex gap-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-2.5 w-20 rounded bg-muted" />
            ))}
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
            <div className="size-8 shrink-0 rounded-full bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="ml-auto h-5 w-40 rounded bg-muted" />
            <div className="h-1.5 w-24 rounded-full bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card px-4 py-3.5">
            <div className="flex items-center gap-3.5">
              <div className="size-9 shrink-0 rounded-full bg-muted" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3.5 w-44 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="pt-2 text-center font-mono text-[11px] text-muted-foreground">Loading workspace…</p>
    </div>
  );
}
