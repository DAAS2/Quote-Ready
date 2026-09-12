export default function EvaluationLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading evaluation">
      <div className="space-y-2">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted" />
      </div>
      <div className="h-7 w-28 rounded bg-muted" />
      <div className="overflow-hidden rounded-lg border bg-card">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
            <div className="size-4 rounded-full bg-muted" />
            <div className="h-3.5 w-48 rounded bg-muted" />
            <div className="ml-auto h-3.5 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
