import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";
import { activeStoreKind } from "@/lib/data/jobs";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default function Settings() {
  return <SettingsPage storeKind={activeStoreKind()} />;
}
