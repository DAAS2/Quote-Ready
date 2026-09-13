export default function NewEnquiryLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" aria-busy="true" aria-label="Loading form">
      <div className="h-3.5 w-16 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-6 w-36 rounded bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-md bg-muted" />
            ))}
          </div>
          <div className="h-16 rounded-md bg-muted" />
          <div className="h-36 rounded-md bg-muted" />
          <div className="h-9 w-40 rounded-md bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
