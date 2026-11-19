import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Building2,
  CalendarCheck,
  ChevronRight,
  FileText,
  LogOut,
  ShieldCheck,
  UserRound,
  Wifi,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { unreadNotificationCount } from "@/lib/notifications";
import { signOutAction } from "@/app/auth/actions";
import { initials } from "@/lib/format";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

function AccountRow({
  href,
  icon: Icon,
  label,
  hint,
  badge,
}: {
  href: string;
  icon: typeof Bell;
  label: string;
  hint: string;
  badge?: number | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-surface-secondary/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus)]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-secondary text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[0.88rem] font-medium text-foreground">
          {label}
          {badge ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[0.62rem] font-bold text-white">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block line-clamp-2 text-[0.74rem] text-muted">{hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}

export default async function AppAccountPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex min-h-[75dvh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted shadow-[var(--shadow-sm)]">
          <UserRound className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[1.4rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
          Your account
        </h1>
        <p className="mt-2 max-w-xs text-[0.85rem] leading-relaxed text-muted">
          Sign in to see your bookings, notifications and contact details.
        </p>
        <Link
          href="/auth/sign-in?next=%2Fapp%2Faccount"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Sign in
        </Link>
        <Link
          href="/app"
          className="mt-3 inline-flex h-11 items-center px-4 text-[0.82rem] font-medium text-muted underline underline-offset-4"
        >
          Keep browsing
        </Link>
      </div>
    );
  }

  const unread = await unreadNotificationCount(user.id).catch(() => 0);
  const isOwner = user.role === "owner" && user.ownerStatus === "approved";
  const isAdmin = user.role === "admin";
  const roleLabel = isAdmin ? "Admin" : isOwner ? "Venue owner" : "Guest";

  return (
    <div className="pb-6">
      <header className="px-5 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <h1 className="text-[1.75rem] font-semibold leading-none tracking-[-0.04em] text-foreground">
          Account
        </h1>
        <p className="mt-1.5 text-[0.8rem] text-muted">
          Bookings, updates and contact details
        </p>
      </header>

      <div className="px-5 pt-4">
        <Link
          href="/app/account/profile"
          className="flex items-center gap-3.5 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-sm)] transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary-soft text-[1.05rem] font-semibold uppercase text-primary">
            {initials(user.fullName, user.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.02rem] font-semibold tracking-[-0.01em] text-foreground">
              {user.fullName || "VenueOne guest"}
            </span>
            <span className="mt-0.5 block truncate text-[0.78rem] text-muted">
              {user.email}
            </span>
            <span className="mt-1.5 inline-flex items-center rounded-full bg-surface-secondary px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-foreground-soft">
              {roleLabel}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </Link>

        <h2 className="mt-6 px-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted">
          Your activity
        </h2>
        <nav
          aria-label="Your activity"
          className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)]"
        >
          <AccountRow
            href="/app/bookings"
            icon={CalendarCheck}
            label="My bookings"
            hint="Status, payment and cancellation for every booking"
          />
          <AccountRow
            href="/app/account/notifications"
            icon={Bell}
            label="Notifications"
            hint={unread > 0 ? `${unread} unread` : "Booking decisions and payment updates"}
            badge={unread > 0 ? unread : null}
          />
        </nav>

        {isOwner || isAdmin ? (
          <>
            <h2 className="mt-6 px-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted">
              {isAdmin ? "Admin" : "Venue owner"}
            </h2>
            <nav
              aria-label={isAdmin ? "Admin" : "Venue owner"}
              className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)]"
            >
              {isOwner ? (
                <AccountRow
                  href="/owner"
                  icon={Building2}
                  label="Owner dashboard"
                  hint="Your venues, bookings and payouts"
                />
              ) : null}
              {isAdmin ? (
                <AccountRow
                  href="/admin"
                  icon={ShieldCheck}
                  label="Admin console"
                  hint="Approvals, payments and platform settings"
                />
              ) : null}
            </nav>
          </>
        ) : null}

        <h2 className="mt-6 px-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted">
          Profile and policies
        </h2>
        <nav
          aria-label="Profile and policies"
          className="mt-2 divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)]"
        >
          <AccountRow
            href="/app/account/profile"
            icon={UserRound}
            label="Profile and contact details"
            hint="The name and phone number venues see"
          />
          <AccountRow
            href="/refund-policy"
            icon={FileText}
            label="Refund and cancellation policy"
            hint="How refunds are calculated"
          />
        </nav>

        <div className="mt-6 rounded-[var(--radius-lg)] bg-surface px-4 py-3.5 shadow-[var(--shadow-sm)]">
          <p className="flex items-center gap-2 text-[0.78rem] font-semibold text-foreground-soft">
            <Wifi className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Live venue data
          </p>
          <p className="mt-1 text-[0.74rem] leading-relaxed text-muted">
            Venues, prices and availability load from the VenueOne server each time
            you open a screen. New venues and edits appear without updating the app.
          </p>
        </div>

        <form action={signOutAction} className="mt-6">
          <input type="hidden" name="next" value="/app" />
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface text-[0.85rem] font-semibold text-error shadow-[var(--shadow-sm)] transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </form>

        <p className="mt-5 px-2 text-center text-[0.7rem] leading-relaxed text-muted">
          Sign in is handled by Google. VenueOne never asks for card details inside
          the app.
        </p>
      </div>
    </div>
  );
}
