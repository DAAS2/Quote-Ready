import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getAuthUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up your workspace" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getAuthUser();
  return <OnboardingWizard signedIn={Boolean(user)} />;
}
