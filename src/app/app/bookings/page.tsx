import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, LogIn, Plus, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { listCustomerBookings } from "@/lib/booking/queries";
import { BookingSummaryCard } from "@/components/booking/booking-summary-card";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import { nowMs } from "@/lib/time";

export const metadata: Metadata = {
  title: "My bookings",
  robots: { index: false, follow: false },
};

const TABS = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "awaiting_payment", label: "To pay" },
  { value: "pending_owner_approval", label: "Awaiting venue" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function AppBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-secondary text-muted">
          <CalendarCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
          Sign in to see your bookings
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          Bookings are tied to the account that made them. Sign in and you will come
          straight back here.
        </p>
        <Link
          href="/auth/sign-in?next=%2Fapp%2Fbookings"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Sign in
        </Link>
        <Link
          href="/app"
          className="mt-3 inline-flex h-10 items-center rounded-[var(--radius-sm)] px-4 text-sm font-medium text-muted underline underline-offset-4"
        >
          Browse venues first
        </Link>
      </div>
    );
  }

  const all = await listCustomerBookings(user.id);
  const now = nowMs();
  const filtered = all.filter((booking) => {
    if (status === "all") return true;
    if (status === "upcoming") {
      return (
        booking.starts_at.getTime() > now &&
        ["confirmed", "awaiting_payment", "pending_owner_approval"].includes(booking.status)
      );
    }
    return booking.status === status;
  });

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
              Your account
            </p>
            <h1 className="mt-0.5 font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
              My bookings
            </h1>
          </div>
          <Link
            href="/app"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted">
          {pluralize(all.length, "booking")} on this account
        </p>
      </header>

      <div className="px-4 pt-3">
        <div
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1"
          role="tablist"
          aria-label="Filter bookings"
        >
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={
                tab.value === "all" ? "/app/bookings" : `/app/bookings?status=${tab.value}`
              }
              role="tab"
              aria-selected={status === tab.value}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                status === tab.value
                  ? "border-primary bg-primary text-white"
                  : "border-border-strong bg-surface text-foreground-soft",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-surface px-5 py-10 text-center">
            <p className="font-display text-base font-semibold text-foreground">
              {all.length === 0 ? "No bookings yet" : "Nothing in this view"}
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
              {all.length === 0
                ? "Pick a real slot on a venue page and the booking appears here from the moment it is requested."
                : "No bookings match this filter. Try another status or view all."}
            </p>
            <Link
              href={all.length === 0 ? "/app" : "/app/bookings"}
              className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              {all.length === 0 ? "Browse venues" : "View all bookings"}
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {filtered.map((booking) => (
              <li key={booking.id}>
                <BookingSummaryCard
                  booking={booking}
                  compact
                  href={`/app/bookings/${booking.id}`}
                />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 flex items-start gap-1.5 px-1 text-[0.68rem] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          Only the account that made a booking can open it, even if the link is shared.
        </p>
      </div>
    </div>
  );
}
