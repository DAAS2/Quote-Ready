"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogoSvg } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

interface ShellNavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number | string;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: ShellNavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: "grid_view",
    match: (p) => p === "/dashboard",
  },
  {
    href: "/jobs",
    label: "Jobs",
    icon: "plumbing",
    match: (p) => p.startsWith("/jobs"),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: "chat_bubble",
    match: (p) => p.startsWith("/messages"),
  },
  {
    href: "/templates",
    label: "Templates",
    icon: "description",
    match: (p) => p.startsWith("/templates"),
  },
  {
    href: "/activity",
    label: "Activity",
    icon: "history",
    match: (p) => p.startsWith("/activity"),
  },
];

/**
 * Workspace shell — transcribed 1:1 from the triage dashboard design
 * (fixed navy sidebar + operations rail header).
 */
export function WorkspaceShell({
  children,
  jobsCount,
  messagesCount,
}: {
  children: React.ReactNode;
  jobsCount: number;
  messagesCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function resetDemo() {
    setResetOpen(false);
    setResetting(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      router.refresh();
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      {/* Workspace Sidebar (Dark Navy) */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 bg-inverse-surface z-50 flex-col justify-between p-space-sm shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:flex">
        <div className="flex flex-col">
          <div className="h-16 px-space-md flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-space-sm">
              <BrandLogoSvg tone="dark" wordmark={false} className="h-8 w-auto object-contain" />
              <span className="font-headline-sm text-headline-sm text-inverse-on-surface tracking-tight">
                QuoteReady
              </span>
            </Link>
            <span className="px-space-xs py-0.5 rounded bg-tertiary text-on-tertiary font-label-sm text-label-sm uppercase tracking-wider">
              Ops
            </span>
          </div>
          <div className="px-space-md pt-space-md pb-space-xs">
            <p className="font-label-sm text-label-sm text-tertiary-fixed-dim uppercase tracking-wider">
              Workspace
            </p>
          </div>
          <nav className="flex flex-col gap-1 px-space-sm" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center justify-between px-space-md py-2.5 rounded-lg transition-all",
                    active
                      ? "bg-primary-container text-on-primary-container font-label-lg"
                      : "text-tertiary-fixed-dim hover:bg-tertiary hover:text-on-tertiary font-label-lg",
                  )}
                  href={item.href}
                >
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                    <span className="font-label-lg text-label-lg">{item.label}</span>
                  </div>
                  {item.href === "/jobs" && jobsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-data-mono text-label-sm">
                      {jobsCount}
                    </span>
                  )}
                  {item.href === "/messages" && messagesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-data-mono text-label-sm">
                      {messagesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-col p-space-sm gap-space-sm">
          <div className="p-space-sm rounded-lg bg-tertiary/40 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-inverse-on-surface">
                  Northside Plumbing
                </span>
                <span className="font-body-sm text-body-sm text-tertiary-fixed-dim">
                  Melbourne, VIC
                </span>
              </div>
              <div className="relative">
                {resetOpen && (
                  <div className="absolute bottom-8 right-0 w-48 rounded-lg bg-surface-container-lowest shadow-lg border border-border py-1 z-10">
                    <button
                      type="button"
                      onClick={resetDemo}
                      disabled={resetting}
                      className="w-full text-left px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      {resetting ? "Resetting…" : "Reset demo data"}
                    </button>
                    <Link
                      href="/settings"
                      className="block px-3 py-2 font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      Workspace settings
                    </Link>
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Workspace options"
                  onClick={() => setResetOpen((v) => !v)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-tertiary-fixed-dim hover:bg-tertiary hover:text-on-tertiary transition-colors"
                >
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">
                    unfold_more
                  </span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="material-symbols-outlined text-primary-fixed-dim text-[14px]">
                verified
              </span>
              <span className="font-label-sm text-label-sm text-tertiary-fixed-dim truncate">
                Lic. #48291 Residential
              </span>
            </div>
          </div>
          <Link
            href="/settings"
            className="p-space-sm rounded-lg flex items-center justify-between bg-tertiary/20 hover:bg-tertiary/40 transition-colors"
          >
            <div className="flex items-center gap-space-sm">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary text-[18px]">
                    person
                  </span>
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary-fixed ring-2 ring-inverse-surface"></span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-inverse-on-surface">
                  Alex Miller
                </span>
                <span className="font-label-sm text-label-sm text-tertiary-fixed-dim">
                  Owner / Plumber
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">
              settings
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col lg:pl-64">
        {/* Top Navigation Rail */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-4 sm:px-space-lg lg:left-64">
          <div className="flex items-center gap-space-md min-w-0">
            <Link
              href="/dashboard"
              className="lg:hidden flex items-center gap-1.5"
              aria-label="QuoteReady dashboard"
            >
              <BrandLogoSvg tone="light" className="h-6 w-auto object-contain" />
            </Link>
            <div className="hidden items-center gap-space-xs font-label-md text-label-md text-on-surface-variant lg:flex">
              <span className="material-symbols-outlined text-[18px]">home</span>
              <span>/</span>
              <span className="text-on-surface font-label-md">Operations Rail</span>
            </div>
            <div className="relative flex items-center max-w-xs sm:max-w-none">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                search
              </span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    router.push(`/jobs?q=${encodeURIComponent(query.trim())}`);
                  }
                }}
                className="w-52 sm:w-80 h-10 pl-9 pr-14 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest transition-all"
                placeholder="Search jobs, address or customer..."
                type="text"
                aria-label="Search jobs, address or customer"
              />
              <kbd className="absolute right-2 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-data-mono text-label-sm">
                ⌘K
              </kbd>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="hidden xl:flex items-center gap-2 px-space-sm py-1.5 rounded-full bg-surface-container-low">
              <span className="material-symbols-outlined text-secondary text-[16px]">
                partly_cloudy_day
              </span>
              <span className="font-label-md text-label-md text-on-surface">
                Melbourne 19°C
              </span>
              <span className="text-outline font-label-sm">•</span>
              <span className="font-data-mono text-data-mono text-on-surface-variant">
                2:15 PM
              </span>
            </div>
            <Link
              href="/messages"
              className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
              aria-label="Messages"
            >
              <span className="material-symbols-outlined text-[22px]">
                notifications
              </span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-container"></span>
            </Link>
            <Link
              href="/settings"
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              aria-label="Account settings"
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </Link>
          </div>
        </header>
        <main className="w-full flex-1 pt-16 bg-surface min-h-dvh">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-space-lg py-space-lg">
            <div className="flex flex-col w-full">{children}</div>
          </div>
        </main>
      </div>
    </>
  );
}
