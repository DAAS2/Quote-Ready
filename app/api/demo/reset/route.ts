import { NextResponse } from "next/server";
import { store } from "@/lib/data/jobs";

export const runtime = "nodejs";

/** Resets the workspace to the three seeded demo jobs. */
export async function POST() {
  try {
    await store.resetDemo();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[QuoteReady] demo reset failed:", error);
    return NextResponse.json({ error: "Reset failed — please try again." }, { status: 500 });
  }
}
