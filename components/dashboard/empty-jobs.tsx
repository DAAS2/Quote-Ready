import { Inbox } from "lucide-react";

export function EmptyJobs({ filtered = false }: { filtered?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
        <Inbox className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-medium">
        {filtered ? "No jobs match this view" : "No jobs yet"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered
          ? "Try a different search or clear the status filter."
          : "Create an enquiry to see QuoteReady turn raw customer input into a quote-ready scope."}
      </p>
    </div>
  );
}
