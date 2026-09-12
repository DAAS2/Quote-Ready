"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DemoResetButton() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  async function reset() {
    setResetting(true);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Reset failed.");
        return;
      }
      toast.success("Demo workspace reset to the three seeded jobs.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={reset}
      disabled={resetting}
      title="Reset the workspace to the seeded demo jobs"
    >
      <RefreshCcw className={`size-3.5 ${resetting ? "animate-spin" : ""}`} aria-hidden />
      <span className="hidden sm:inline">Reset demo</span>
    </Button>
  );
}
