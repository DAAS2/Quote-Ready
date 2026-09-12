export default function JobDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading job">
      <div className="h-3.5 w-16 rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-6 w-48 rounded bg-muted" />
        <div className="h-5 w-64 rounded bg-muted" />
      </div>
      <div className="h-28 rounded-lg border bg-card" />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="h-44 rounded-lg border bg-card" />
          <div className="h-40 rounded-lg border bg-card" />
        </div>
        <div className="space-y-5">
          <div className="h-52 rounded-lg border bg-card" />
        </div>
      </div>
    </div>
  );
}
