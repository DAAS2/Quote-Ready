"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[QuoteReady] workspace error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
      <p className="text-sm font-semibold">Something went wrong</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
        The workspace hit an unexpected error. The demo data is safe — try again.
      </p>
      <Button onClick={reset} size="sm" className="mt-4">
        Try again
      </Button>
    </div>
  );
}
