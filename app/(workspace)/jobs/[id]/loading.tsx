export default function JobDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading job">
      <div className="h-3.5 w-16 rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-5 w-72 rounded bg-muted" />
      </div>
      <div className="h-32 rounded-lg border bg-card" />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="rounded-lg border bg-card p-5">
            <div className="flex gap-6 border-b pb-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-3.5 w-20 rounded bg-muted" />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 rounded-md bg-muted" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="h-48 rounded-lg border bg-card" />
          <div className="h-24 rounded-lg border bg-card" />
        </div>
      </div>
      <p className="pt-2 text-center font-mono text-[11px] text-muted-foreground">Loading job…</p>
    </div>
  );
}
