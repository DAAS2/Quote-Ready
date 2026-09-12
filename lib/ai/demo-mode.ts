/**
 * Demo mode forces the deterministic fallback path end-to-end:
 * no live Gemini/ElevenLabs calls, seeded outcomes instead.
 * Used for rehearsal and as the primary outage insurance.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";
}
