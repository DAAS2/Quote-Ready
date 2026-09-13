"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogoSvg } from "@/components/brand/logo";
import { TourOverlay } from "@/components/onboarding/tour-overlay";
import { useSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils/format";

export interface AlertItem {
  id: string;
  job_id: string;
  job_name: string;
  actor_type: "user" | "ai" | "system";
  event_type: string;
  summary: string;
  created_at: string;
}

interface ShellNavItem {
  href: string;
  label: string;
  icon: string;
  tour?: string;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: ShellNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "grid_view", match: (p) => p === "/dashboard" },
  {
    href: "/jobs",
    label: "Jobs",
    icon: "handyman",
    match: (p) => p.startsWith("/jobs"),
  },
  { href: "/messages", label: "Messages", icon: "chat_bubble", match: (p) => p.startsWith("/messages") },
  {
    href: "/templates",
    label: "Templates",
    icon: "description",
    tour: "nav-templates",
    match: (p) => p.startsWith("/templates"),
  },
];

const ALERT_ICONS: Record<string, { icon: string; tone: string }> = {
  enquiry_received: { icon: "inbox", tone: "text-secondary" },
  analysis_completed: { icon: "auto_awesome", tone: "text-primary" },
  draft_created: { icon: "mark_email_unread", tone: "text-secondary" },
  follow_up_approved: { icon: "mark_email_read", tone: "text-[#15803D]" },
  voice_note_applied: { icon: "mic", tone: "text-primary" },
  inspection_requested: { icon: "calendar_month", tone: "text-tertiary" },
  scope_signed_off: { icon: "verified", tone: "text-[#15803D]" },
  evidence_added: { icon: "photo_library", tone: "text-secondary" },
};

const PAGE_TITLES: Array<[string, string]> = [
  ["/jobs/new", "New enquiry"],
  ["/jobs", "Jobs"],
  ["/dashboard", "Overview"],
  ["/messages", "Messages"],
  ["/templates", "Templates"],
  ["/settings", "Settings"],
];

function pageTitle(pathname: string): string {
  for (const [prefix, label] of PAGE_TITLES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return label;
  }
  return "Workspace";
}

/**
 * Workspace shell — navy sidebar (collapsible on desktop, slide-over on
 * mobile) + operations rail header with live alerts.
 */
export function WorkspaceShell({
  children,
  jobsCount,
  messagesCount,
  alerts,
  businessName,
  operatorName,
  email,
  isDemo,
  serviceArea,
}: {
  children: React.ReactNode;
  jobsCount: number;
  messagesCount: number;
  alerts: AlertItem[];
  businessName: string;
  operatorName: string;
  email: string | null;
  isDemo: boolean;
  serviceArea: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useSession();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [seenAt, setSeenAt] = useState<string>("");

  useEffect(() => {
    // read persisted UI prefs once on mount (client-only)
    const timer = setTimeout(() => {
      setSeenAt(window.localStorage.getItem("qr-alerts-seen-at") ?? "");
      setCollapsed(window.localStorage.getItem("qr-sidebar-collapsed") === "1");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // close the mobile drawer whenever the route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

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

  const unreadCount = seenAt
    ? alerts.filter((a) => new Date(a.created_at).getTime() > new Date(seenAt).getTime()).length
    : alerts.length;

  function markAllRead() {
    const now = new Date().toISOString();
    window.localStorage.setItem("qr-alerts-seen-at", now);
    setSeenAt(now);
  }

  function openAlert(alert: AlertItem) {
    markAllRead();
    setAlertsOpen(false);
    router.push(`/jobs/${alert.job_id}`);
  }

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem("qr-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const nav = (
    <>
      <div className="flex flex-col">
        <div
          className={cn(
            "h-16 px-space-sm flex items-center gap-space-sm",
            collapsed && "lg:justify-center lg:px-0",
          )}
        >
          <Link href="/dashboard" className="flex items-center gap-space-sm min-w-0">
            <BrandLogoSvg tone="dark" wordmark={false} className="h-8 w-auto object-contain" />
            {!collapsed && (
              <span className="font-headline-sm text-headline-sm text-inverse-on-surface tracking-tight truncate">
                QuoteReady
              </span>
            )}
          </Link>
          {!collapsed && (
            <span className="ml-auto px-space-xs py-0.5 rounded bg-tertiary text-on-tertiary font-label-sm text-label-sm uppercase tracking-wider">
              Ops
            </span>
          )}
        </div>
        {!collapsed && (
          <div className="px-space-md pt-space-md pb-space-xs">
            <p className="font-label-sm text-label-sm text-tertiary-fixed-dim uppercase tracking-wider">
              Workspace
            </p>
          </div>
        )}
        <nav className="flex flex-col gap-1 px-space-sm" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                data-tour={item.tour}
                className={cn(
                  "group flex items-center px-space-md py-2.5 rounded-lg transition-all",
                  collapsed && "lg:justify-center lg:px-0",
                  collapsed ? "justify-between" : "justify-between",
                  active
                    ? "bg-primary-container text-on-primary-container font-label-lg"
                    : "text-tertiary-fixed-dim hover:bg-tertiary hover:text-on-tertiary font-label-lg",
                )}
                href={item.href}
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {!collapsed && <span className="font-label-lg text-label-lg">{item.label}</span>}
                </div>
                {!collapsed && item.href === "/jobs" && jobsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-data-mono text-label-sm">
                    {jobsCount}
                  </span>
                )}
                {!collapsed && item.href === "/messages" && messagesCount > 0 && (
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
        {!collapsed && (
          <div className="p-space-sm rounded-lg bg-tertiary/40 flex flex-col gap-1">
            <span className="font-label-md text-label-md text-inverse-on-surface truncate">
              {businessName}
            </span>
            <span className="font-body-sm text-body-sm text-tertiary-fixed-dim truncate">
              {serviceArea || (isDemo ? "Demo workspace" : "Set your service area")}
            </span>
          </div>
        )}
        <Link
          href="/settings"
          title={collapsed ? operatorName : undefined}
          className={cn(
            "p-space-sm rounded-lg flex items-center gap-space-sm bg-tertiary/20 hover:bg-tertiary/40 transition-colors",
            collapsed && "lg:justify-center",
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-inverse-on-surface truncate">
                {operatorName}
              </span>
              <span className="font-label-sm text-label-sm text-tertiary-fixed-dim truncate">
                {email ?? "Workspace owner"}
              </span>
            </div>
          )}
        </Link>
        {isDemo ? (
          <Link
            href="/signup"
            className={cn(
              "p-2.5 rounded-lg flex items-center gap-space-sm bg-primary-container text-on-primary font-label-md text-label-md hover:bg-primary transition-colors",
              collapsed && "lg:justify-center",
            )}
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            {!collapsed && <span>Create account</span>}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "p-2.5 rounded-lg flex items-center gap-space-sm bg-error/15 hover:bg-error/25 text-inverse-on-surface font-label-md text-label-md transition-colors disabled:opacity-60",
              collapsed && "lg:justify-center",
            )}
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {!collapsed && <span>{signingOut ? "Signing out…" : "Sign out"}</span>}
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <TourOverlay />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 hidden h-full bg-inverse-surface z-50 flex-col justify-between p-space-sm shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:flex transition-[width] duration-200",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        {nav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-[#0b1524]/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-inverse-surface flex flex-col justify-between p-space-sm shadow-2xl overflow-y-auto custom-scroll">
            <div className="flex flex-col">
              <div className="h-16 px-space-sm flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-space-sm">
                  <BrandLogoSvg tone="dark" wordmark={false} className="h-8 w-auto object-contain" />
                  <span className="font-headline-sm text-headline-sm text-inverse-on-surface tracking-tight">
                    QuoteReady
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-lg text-tertiary-fixed-dim hover:bg-tertiary hover:text-on-tertiary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="px-space-md pt-space-md pb-space-xs">
                <p className="font-label-sm text-label-sm text-tertiary-fixed-dim uppercase tracking-wider">
                  Workspace
                </p>
              </div>
              <nav className="flex flex-col gap-1 px-space-sm" aria-label="Primary mobile">
                {NAV_ITEMS.map((item) => {
                  const active = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      aria-current={active ? "page" : undefined}
                      data-tour={item.tour}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-space-md py-2.5 rounded-lg transition-all",
                        active
                          ? "bg-primary-container text-on-primary-container font-label-lg"
                          : "text-tertiary-fixed-dim hover:bg-tertiary hover:text-on-tertiary font-label-lg",
                      )}
                      href={item.href}
                    >
                      <div className="flex items-center gap-space-sm">
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
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
              <div className="p-space-sm rounded-lg bg-tertiary/40 flex flex-col gap-1">
                <span className="font-label-md text-label-md text-inverse-on-surface truncate">
                  {businessName}
                </span>
                <span className="font-body-sm text-body-sm text-tertiary-fixed-dim truncate">
                  {serviceArea || (isDemo ? "Demo workspace" : "Set your service area")}
                </span>
              </div>
              {isDemo ? (
                <Link
                  href="/signup"
                  className="p-2.5 rounded-lg flex items-center gap-space-sm bg-primary-container text-on-primary font-label-md text-label-md"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <span>Create account</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="p-2.5 rounded-lg flex items-center gap-space-sm bg-error/15 hover:bg-error/25 text-inverse-on-surface font-label-md text-label-md transition-colors disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>{signingOut ? "Signing out…" : "Sign out"}</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className={cn("flex min-h-dvh flex-col", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        {/* Top Navigation Rail */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between gap-3 px-3 sm:px-space-lg lg:left-64">
          <div className="flex items-center gap-space-md min-w-0">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleCollapsed}
              className="hidden lg:flex p-2 -ml-1 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">
                {collapsed ? "right_panel_open" : "left_panel_close"}
              </span>
            </button>
            <Link
              href="/dashboard"
              className="lg:hidden flex items-center"
              aria-label="QuoteReady dashboard"
            >
              <BrandLogoSvg tone="light" wordmark={false} className="h-6 w-auto object-contain" />
            </Link>
            <div className="hidden items-center gap-space-xs font-label-md text-label-md text-on-surface-variant lg:flex">
              <span className="material-symbols-outlined text-[18px]">home</span>
              <span>/</span>
              <span className="text-on-surface font-label-md">{pageTitle(pathname)}</span>
            </div>
            <div className="relative flex items-center flex-1 lg:flex-none min-w-0">
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
                className="w-full lg:w-80 h-10 pl-9 pr-14 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest transition-all"
                placeholder="Search jobs, address or customer..."
                type="text"
                aria-label="Search jobs, address or customer"
              />
              <kbd className="hidden sm:block absolute right-2 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-data-mono text-label-sm">
                ⌘K
              </kbd>
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            {/* Alerts */}
            <div className="relative">
              <button
                className={cn(
                  "relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors",
                  alertsOpen && "bg-surface-container-low text-on-surface",
                )}
                onClick={() => setAlertsOpen((v) => !v)}
                aria-label={`Alerts${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
                aria-expanded={alertsOpen}
                type="button"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-error text-on-error font-data-mono text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {alertsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAlertsOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-surface-container-lowest shadow-[0_10px_15px_-3px_rgba(16,42,67,0.10),0_4px_6px_-4px_rgba(16,42,67,0.05)] border border-border z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg text-on-surface">Alerts</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-error-container/60 text-on-error-container font-label-sm text-label-sm">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <button
                        className="font-label-sm text-label-sm text-primary hover:underline disabled:opacity-50"
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                        type="button"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scroll">
                      {alerts.length === 0 && (
                        <p className="px-4 py-8 text-center font-body-sm text-body-sm text-on-surface-variant">
                          No activity yet — actions you take will appear here.
                        </p>
                      )}
                      {alerts.map((alert) => {
                        const meta = ALERT_ICONS[alert.event_type] ?? {
                          icon: "notifications",
                          tone: "text-outline",
                        };
                        const unread = !seenAt || new Date(alert.created_at) > new Date(seenAt);
                        return (
                          <button
                            key={alert.id}
                            className={cn(
                              "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-container-low transition-colors border-b border-border/60 last:border-b-0",
                              unread && "bg-surface-container-low/50",
                            )}
                            onClick={() => openAlert(alert)}
                            type="button"
                          >
                            <span
                              className={cn(
                                "w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0",
                                meta.tone,
                              )}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {meta.icon}
                              </span>
                            </span>
                            <span className="flex flex-col min-w-0 flex-1">
                              <span className="font-label-md text-label-md text-on-surface truncate">
                                {alert.job_name}
                              </span>
                              <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                                {alert.summary}
                              </span>
                              <span className="font-data-mono text-label-sm text-outline mt-0.5">
                                {relativeTime(alert.created_at)} · {alert.actor_type} action
                              </span>
                            </span>
                            {unread && (
                              <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="px-4 py-3 border-t border-border text-center">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        The last {alerts.length} workspace events · all actions stay under your review
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
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
