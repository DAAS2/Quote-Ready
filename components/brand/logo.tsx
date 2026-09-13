import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * QuoteReady brand logo — transcribed 1:1 from the brand logo design
 * (designs/.../quoteready_brand_logo/code.html).
 * `tone="dark"` renders the white wordmark (for the navy sidebar / CTA),
 * `tone="light"` swaps the wordmark to navy so it reads on white surfaces.
 */
export function BrandLogoSvg({
  className,
  tone = "dark",
  wordmark = true,
}: {
  className?: string;
  tone?: "dark" | "light";
  /** false renders the logo mark only (the wordmark text is provided separately) */
  wordmark?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={wordmark ? "0 0 160 40" : "0 0 40 40"}
      fill="none"
      className={cn("h-8 w-auto object-contain", className)}
      aria-hidden
    >
      <rect x="2" y="4" width="32" height="32" rx="8" fill="#0F766E" />
      <path
        d="M12 21L16 25L24 15"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 11H25C26.1046 11 27 11.8954 27 13V27C27 28.1046 26.1046 29 25 29H11C9.89543 29 9 28.1046 9 27V13C9 11.8954 9.89543 11 11 11H14"
        stroke="#A7F3D0"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {wordmark && (
        <text
          x="42"
          y="25"
          fontFamily="Inter, -apple-system, sans-serif"
          fontSize="18"
          fontWeight="700"
          fill={tone === "dark" ? "#FFFFFF" : "#102A43"}
          letterSpacing="-0.02em"
        >
          Quote
          <tspan fill="#38BDF8">Ready</tspan>
        </text>
      )}
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  tone = "light",
}: {
  className?: string;
  href?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-space-sm rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <BrandLogoSvg tone={tone} wordmark={false} />
      <span className="font-headline-sm text-headline-sm tracking-tight">
        QuoteReady
      </span>
    </Link>
  );
}
