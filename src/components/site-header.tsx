"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ButtonLink } from "@/components/ui/button";
import { signOutAction } from "@/app/auth/actions";
import { cn } from "@/lib/cn";
import { navigation } from "@/lib/brand";

export type HeaderUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "customer" | "owner" | "admin";
  ownerStatus: string;
  unread: number;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "C").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export function SiteHeader({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const [mobileOpenAt, setMobileOpenAt] = useState<string | null>(null);
  const [accountOpenAt, setAccountOpenAt] = useState<string | null>(null);
  const mobileOpen = mobileOpenAt === pathname;
  const accountOpen = accountOpenAt === pathname;
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpenAt(null);
        setAccountOpenAt(null);
      }
    };
    const onClick = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpenAt(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const dashboardHref =
    user?.role === "admin" ? "/admin" : user?.role === "owner" && user.ownerStatus === "approved" ? "/owner" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-md">
      <div className="container-page flex h-[var(--header-height)] items-center justify-between gap-4">
        <BrandMark />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {navigation.public.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative rounded-[var(--radius-sm)] px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                isActive(pathname, item.href)
                  ? "text-foreground"
                  : "text-muted hover:text-foreground",
              )}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
            >
              {item.label}
              {isActive(pathname, item.href) ? (
                <span className="absolute inset-x-3 -bottom-[1.05rem] h-[2px] rounded-full bg-primary" aria-hidden="true" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/dashboard/notifications"
                className="relative hidden h-10 w-10 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-secondary hover:text-foreground sm:grid"
                aria-label={
                  user.unread > 0
                    ? `Notifications, ${user.unread > 9 ? "9+" : user.unread} unread`
                    : "Notifications"
                }
              >
                <Bell className="h-4.5 w-4.5" aria-hidden="true" />
                {user.unread > 0 ? (
                  <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.58rem] font-bold text-white">
                    {user.unread > 9 ? "9+" : user.unread}
                  </span>
                ) : null}
              </Link>

              <div className="relative hidden sm:block" ref={accountRef}>
                <button
                  type="button"
                  className="flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-border-strong bg-surface px-2 pr-2.5 text-left transition-colors hover:border-primary/35"
                  onClick={() => setAccountOpenAt(accountOpen ? null : pathname)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-[0.62rem] font-bold text-primary">
                    {initials(user.fullName, user.email)}
                  </span>
                  <span className="max-w-24 truncate text-xs font-medium text-foreground">
                    {user.fullName?.split(" ")[0] ?? "Account"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                </button>

                {accountOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]"
                    role="menu"
                  >
                    <div className="border-b border-border px-3 py-2.5">
                      <p className="truncate text-sm font-medium text-foreground">{user.fullName ?? "Account"}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
                        {user.role === "admin" ? "Super admin" : user.role === "owner" ? "Venue owner" : "Customer"}
                      </p>
                    </div>
                    <Link href={dashboardHref} role="menuitem" className="flex items-center gap-2.5 rounded-[var(--radius-xs)] px-3 py-2.5 text-sm text-foreground-soft hover:bg-surface-secondary">
                      <LayoutDashboard className="h-4 w-4 text-muted" aria-hidden="true" /> Dashboard
                    </Link>
                    <Link href="/dashboard/profile" role="menuitem" className="flex items-center gap-2.5 rounded-[var(--radius-xs)] px-3 py-2.5 text-sm text-foreground-soft hover:bg-surface-secondary">
                      <UserRound className="h-4 w-4 text-muted" aria-hidden="true" /> Profile
                    </Link>
                    <Link href="/dashboard/notifications" role="menuitem" className="flex items-center gap-2.5 rounded-[var(--radius-xs)] px-3 py-2.5 text-sm text-foreground-soft hover:bg-surface-secondary">
                      <Bell className="h-4 w-4 text-muted" aria-hidden="true" /> Notifications
                      {user.unread > 0 ? <span className="ml-auto rounded-full bg-primary-soft px-1.5 text-[0.62rem] font-semibold text-primary">{user.unread}</span> : null}
                    </Link>
                    <form action={signOutAction} className="border-t border-border pt-1">
                      <button type="submit" role="menuitem" className="flex w-full items-center gap-2.5 rounded-[var(--radius-xs)] px-3 py-2.5 text-sm text-foreground-soft hover:bg-surface-secondary">
                        <LogOut className="h-4 w-4 text-muted" aria-hidden="true" /> Sign out
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>

              <ButtonLink href={dashboardHref} variant="primary" size="sm" className="hidden md:inline-flex">
                Dashboard
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href="/auth/sign-in" variant="secondary" size="sm" className="hidden sm:inline-flex">
              Sign in
            </ButtonLink>
          )}

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] text-foreground hover:bg-surface-secondary lg:hidden"
            onClick={() => setMobileOpenAt(mobileOpen ? null : pathname)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div id="mobile-navigation" className="border-t border-border bg-background lg:hidden">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile primary">
            {navigation.public.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-[var(--radius-sm)] px-2 py-3 text-sm font-medium",
                  isActive(pathname, item.href) ? "bg-surface-secondary text-foreground" : "text-foreground-soft",
                )}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {user ? (
                <>
                  <ButtonLink href={dashboardHref} size="md">Dashboard</ButtonLink>
                  <ButtonLink href="/dashboard/notifications" variant="secondary" size="md">
                    Notifications{user.unread > 0 ? ` (${user.unread})` : ""}
                  </ButtonLink>
                  <form action={signOutAction}>
                    <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-medium text-muted hover:text-foreground">
                      <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                    </button>
                  </form>
                </>
              ) : (
                <ButtonLink href="/auth/sign-in" size="md">Sign in</ButtonLink>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
