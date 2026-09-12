import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewEnquiryForm } from "@/components/jobs/new-enquiry-form";

export const metadata: Metadata = { title: "New enquiry" };

export default function NewEnquiryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring/60 rounded"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All jobs
        </Link>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">New enquiry</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Capture the customer&apos;s words as they came in — QuoteReady handles the structure.
        </p>
      </div>
      <NewEnquiryForm />
    </div>
  );
}
