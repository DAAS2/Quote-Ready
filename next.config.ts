import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The docx-quote skill (`.agents/skills/docx-quote/SKILL.md`) is read from
   * disk at runtime and injected into the quote-drafting prompt. Next's output
   * tracing only follows imports, so it has to be declared explicitly or the
   * deployed route would silently fall back to the condensed skill.
   */
  outputFileTracingIncludes: {
    "/*": [".agents/skills/docx-quote/SKILL.md"],
  },
};

export default nextConfig;
