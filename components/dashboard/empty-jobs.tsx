import { Inbox } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function EmptyJobs() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-secondary">
        <Inbox className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-medium">No jobs match this view</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create an enquiry to see QuoteReady turn raw customer input into a quote-ready scope.
      </p>
      <Link href="/jobs/new" className={buttonVariants({ size: "sm" }) + " mt-4"}>
        New enquiry
      </Link>
    </div>
  );
}
