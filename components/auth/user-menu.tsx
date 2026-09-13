"use client";

import Link from "next/link";
import { LogIn, LogOut, Settings, UserRound } from "lucide-react";
import { useSession } from "@/lib/auth/session";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user, loading, signOut } = useSession();

  return (
    <div className="relative">
      <details className="group">
        <summary
          className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring/60 [&::-webkit-details-marker]:hidden"
          aria-label={user ? `Account menu for ${user.name ?? user.email ?? "you"}` : "Account menu"}
        >
          {loading ? (
            <span className="size-3 animate-pulse rounded-full bg-primary-foreground/50" aria-hidden />
          ) : (
            initials(user?.name || user?.email || "Guest")
          )}
        </summary>
        <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border bg-popover p-1.5 shadow-xl">
          {user ? (
            <>
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium">
                  {user.name || "QuoteReady operator"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
              <MenuLink href="/settings" icon={Settings} label="Settings" />
              <MenuLink href="/dashboard" icon={UserRound} label="My jobs" />
              <button
                type="button"
                onClick={() => signOut()}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium">Demo mode</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Signed in as a guest. Create an account to keep your scopes.
                </p>
              </div>
              <MenuLink href="/login" icon={LogIn} label="Sign in" />
              <MenuLink href="/signup" icon={UserRound} label="Create account" />
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </Link>
  );
}