import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarCheck,
  ChevronRight,
  LogOut,
  ShieldCheck,
  UserRound,
  Wifi,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { unreadNotificationCount } from "@/lib/notifications";
import { signOutAction } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

function initials(name: string | null, email: string) {
  const source = name?.trim() || email.split("@")[0];
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "V") + (parts[1]?.[0] ?? "");
}

export default async function AppAccountPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-secondary text-muted">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
          Your account
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          Sign in to see your bookings, notifications and contact details.
        </p>
        <Link
          href="/auth/sign-in?next=%2Fapp%2Faccount"
          className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Sign in
        </Link>
        <Link
          href="/app"
          className="mt-3 inline-flex h-10 items-center rounded-[var(--radius-sm)] px-4 text-sm font-medium text-muted underline underline-offset-4"
        >
          Keep browsing
        </Link>
      </div>
    );
  }

  const unread = await unreadNotificationCount(user.id).catch(() => 0);
  const isOwner = user.role === "owner" && user.ownerStatus === "approved";
  const isAdmin = user.role === "admin";

  const links = [
    {
      href: "/app/bookings",
      label: "My bookings",
      hint: "Status, payment and cancellation for every booking",
      icon: CalendarCheck,
    },
    {
      href: "/dashboard/profile",
      label: "Profile and contact details",
      hint: "The name and phone number venues see",
      icon: UserRound,
    },
    {
      href: "/dashboard/notifications",
      label: "Notifications",
      hint: unread > 0 ? `${unread} unread` : "Booking decisions and payment updates",
      icon: Bell,
      badge: unread > 0 ? unread : null,
    },
    ...(isOwner
      ? [
          {
            href: "/owner",
            label: "Owner dashboard",
            hint: "Your venues, bookings and payouts",
            icon: Building2,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            href: "/admin",
            label: "Admin console",
            hint: "Approvals, payments and platform settings",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
          Your account
        </p>
        <h1 className="mt-0.5 font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
          Account
        </h1>
      </header>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold uppercase text-primary">
            {initials(user.fullName, user.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-foreground">
              {user.fullName || "VenueOne guest"}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-foreground-soft">
              {isAdmin ? "Admin" : isOwner ? "Venue owner" : "Guest"}
            </p>
          </div>
        </div>

        <nav aria-label="Account links" className="mt-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const badge = "badge" in link ? link.badge : null;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-secondary text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {link.label}
                    {badge ? (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {link.hint}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3.5">
          <p className="flex items-center gap-2 text-xs font-semibold text-foreground-soft">
            <Wifi className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Live venue data
          </p>
          <p className="mt-1 text-[0.7rem] leading-relaxed text-muted">
            Venues, prices and availability load from the VenueOne server each time
            you open a screen. New venues and edits appear without updating the app.
          </p>
        </div>

        <form action={signOutAction} className="mt-4">
          <input type="hidden" name="next" value="/app" />
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface text-sm font-medium text-foreground-soft hover:border-border-strong"
          >
            <LogOut className="h-4 w-4 text-muted" aria-hidden="true" />
            Sign out
          </button>
        </form>

        <p className="mt-4 text-center text-[0.65rem] leading-relaxed text-muted">
          Sign in is handled by Google. VenueOne never asks for card details inside
          the app.
        </p>
      </div>
    </div>
  );
}
