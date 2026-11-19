import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, LogIn, Plus, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { listCustomerBookings } from "@/lib/booking/queries";
import { AppBookingCard } from "@/components/mobile/app-booking-card";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import { nowMs } from "@/lib/time";
import type { BookingWithVenue } from "@/lib/types";

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

type TabValue = (typeof TABS)[number]["value"];

function matchesTab(booking: BookingWithVenue, tab: TabValue, now: number) {
  if (tab === "all") return true;
  if (tab === "upcoming") {
    return (
      booking.starts_at.getTime() > now &&
      ["confirmed", "awaiting_payment", "pending_owner_approval"].includes(booking.status)
    );
  }
  return booking.status === tab;
}

export default async function AppBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = typeof params.status === "string" ? params.status : "all";
  const status = TABS.some((tab) => tab.value === requested) ? (requested as TabValue) : "all";
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex min-h-[75dvh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted shadow-[var(--shadow-sm)]">
          <CalendarCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[1.4rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
          Sign in to see your bookings
        </h1>
        <p className="mt-2 max-w-xs text-[0.85rem] leading-relaxed text-muted">
          Bookings are tied to the account that made them. Sign in and you will come
          straight back here.
        </p>
        <Link
          href="/auth/sign-in?next=%2Fapp%2Fbookings"
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Sign in
        </Link>
        <Link
          href="/app"
          className="mt-3 inline-flex h-11 items-center px-4 text-[0.82rem] font-medium text-muted underline underline-offset-4"
        >
          Browse venues first
        </Link>
      </div>
    );
  }

  const all = await listCustomerBookings(user.id);
  const now = nowMs();
  const filtered = all.filter((booking) => matchesTab(booking, status, now));
  const counts = Object.fromEntries(
    TABS.map((tab) => [tab.value, all.filter((booking) => matchesTab(booking, tab.value, now)).length]),
  ) as Record<TabValue, number>;

  return (
    <div className="pb-4">
      <header className="sticky top-0 z-30 bg-background/92 px-5 pb-2 pt-[calc(0.85rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[1.75rem] font-semibold leading-none tracking-[-0.04em] text-foreground">
              Bookings
            </h1>
            <p className="mt-1.5 text-[0.8rem] text-muted">
              {pluralize(all.length, "booking")} on this account
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[0.8rem] font-semibold text-white transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New
          </Link>
        </div>

        <div
          className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Filter bookings"
        >
          {TABS.map((tab) => {
            const active = status === tab.value;
            const count = counts[tab.value];
            return (
              <Link
                key={tab.value}
                href={tab.value === "all" ? "/app/bookings" : `/app/bookings?status=${tab.value}`}
                role="tab"
                aria-selected={active}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8rem] font-medium transition-colors",
                  active
                    ? "bg-primary text-white"
                    : "bg-surface text-foreground-soft shadow-[var(--shadow-sm)]",
                )}
              >
                {tab.label}
                {count > 0 ? (
                  <span className={cn("text-[0.7rem] tabular", active ? "text-white/75" : "text-muted")}>
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </header>

      <div className="px-5 pt-3">
        {filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center px-2 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted shadow-[var(--shadow-sm)]">
              <CalendarCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[1.05rem] font-semibold text-foreground">
              {all.length === 0 ? "No bookings yet" : "Nothing in this view"}
            </p>
            <p className="mt-1.5 max-w-xs text-[0.85rem] leading-relaxed text-muted">
              {all.length === 0
                ? "Pick a real slot on a venue page and the booking appears here from the moment it is requested."
                : "No bookings match this filter. Try another status or view all."}
            </p>
            <Link
              href={all.length === 0 ? "/app" : "/app/bookings"}
              className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-[0.82rem] font-semibold text-white transition-transform active:scale-[0.98]"
            >
              {all.length === 0 ? "Browse venues" : "View all bookings"}
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((booking) => (
              <li key={booking.id}>
                <AppBookingCard booking={booking} />
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 flex items-start gap-1.5 px-1 text-[0.7rem] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          Only the account that made a booking can open it, even if the link is shared.
        </p>
      </div>
    </div>
  );
}
