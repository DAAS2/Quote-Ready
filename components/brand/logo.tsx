import { cn } from "@/lib/utils";

/**
 * QuoteReady brand mark — a rounded "scope sheet" with a checkmark formed
 * by the readiness needle. Used everywhere the brand appears.
 */
export function LogoMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "size-10" : size === "sm" ? "size-6" : "size-8";
  const inner = size === "lg" ? "size-5" : size === "sm" ? "size-3" : "size-4";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-[30%] bg-gradient-to-br from-primary via-[oklch(0.62_0.17_245)] to-[oklch(0.646_0.194_41.1)] text-primary-foreground shadow-[0_4px_14px_-4px_rgb(37_64_233/0.55),inset_0_1px_0_rgb(255_255_255/0.25)]",
        box,
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className={inner}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6.5h13.5" opacity="0.55" />
        <path d="M3 12h18" opacity="0.8" />
        <path d="M3 17.5h9.5" opacity="0.55" />
        <path d="M16.5 15.5 19 18l4.5-5" transform="translate(-2.5,-1)" />
        <circle cx="20.5" cy="13.25" r="4.75" opacity="0.35" transform="translate(-2.5,-1)" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  markSize = "md",
  href = "/",
}: {
  className?: string;
  markSize?: "sm" | "md" | "lg";
  href?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-ring/60",
        className,
      )}
    >
      <LogoMark size={markSize} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">
          QuoteReady
        </span>
        <span className="mt-0.5 hidden text-[10px] font-medium tracking-wide text-muted-foreground sm:block">
          Scope before you price
        </span>
      </span>
    </a>
  );
}