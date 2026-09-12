import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function JobNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
      <p className="text-sm font-semibold">Job not found</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        This job may have been reset with the demo data.
      </p>
      <Link href="/dashboard" className={buttonVariants({ size: "sm" }) + " mt-4"}>
        Back to jobs
      </Link>
    </div>
  );
}
