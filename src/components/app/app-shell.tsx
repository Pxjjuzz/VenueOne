import Link from "next/link";
import { Bell, ChevronDown } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { AppNav } from "@/components/app/app-nav";
import type { SessionUser } from "@/lib/auth/session";
import { initials } from "@/lib/format";

function roleLabel(user: SessionUser): string {
  if (user.role === "admin") return "Super admin";
  if (user.role === "owner" && user.ownerStatus === "approved") return "Venue owner";
  return "Customer";
}

export function AppShell({
  user,
  unread,
  children,
}: {
  user: SessionUser;
  unread: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <a href="#app-main" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="container-page flex h-[var(--header-height)] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BrandMark />
            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
            <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted sm:block">
              {roleLabel(user)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/notifications"
              className="relative grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-secondary hover:text-foreground"
              aria-label={
                unread > 0
                  ? `Notifications, ${unread > 9 ? "9+" : unread} unread`
                  : "Notifications"
              }
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unread > 0 ? (
                <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.56rem] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>

            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border-strong bg-surface py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-primary/35"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-soft text-[0.6rem] font-bold text-primary">
                {initials(user.fullName, user.email)}
              </span>
              <span className="hidden max-w-28 truncate text-xs font-medium text-foreground sm:block">
                {user.fullName?.split(" ")[0] ?? "Account"}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted sm:block" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div className="container-page flex flex-col gap-6 py-6 lg:flex-row lg:gap-10 lg:py-8">
        <AppNav role={user.role} ownerStatus={user.ownerStatus} unread={unread} />
        <main id="app-main" className="min-w-0 flex-1 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
