import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Users } from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import { listOwnerBookings } from "@/lib/booking/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatDateTime, formatMoney, pluralize } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  bookingStatusTone,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Booking requests",
  robots: { index: false, follow: false },
};

const tabs = [
  { value: "all", label: "All" },
  { value: "pending_owner_approval", label: "Needs decision" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function paymentTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "processing") return "warning" as const;
  if (status === "refunded" || status === "partially_refunded") return "info" as const;
  return "neutral" as const;
}

export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireOwner();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "all";

  const [bookings, all] = await Promise.all([
    listOwnerBookings(user.id, status),
    listOwnerBookings(user.id),
  ]);
  const pendingCount = all.filter(
    (booking) => booking.status === "pending_owner_approval",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Venue owner"
        title="Booking requests"
        description={`${pluralize(all.length, "booking")} across your venues. Requests waiting on a decision hold their slot until you respond.`}
        actions={
          <ButtonLink href="/owner" variant="secondary" size="sm">
            Overview
          </ButtonLink>
        }
      />

      {pendingCount > 0 ? (
        <p className="rounded-[var(--radius-sm)] border border-warning/30 bg-warning-soft px-3.5 py-3 text-xs leading-relaxed text-warning">
          {pluralize(pendingCount, "request")} waiting on you. The slot stays held while
          the request is pending.
        </p>
      ) : null}

      <div
        className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        role="tablist"
        aria-label="Filter booking requests"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/owner/bookings" : `/owner/bookings?status=${tab.value}`}
            role="tab"
            aria-selected={status === tab.value}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              status === tab.value
                ? "border-primary bg-primary text-white"
                : "border-border-strong bg-surface text-foreground-soft hover:border-primary/40",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          variant="booking"
          title={all.length === 0 ? "No bookings yet" : "Nothing in this view"}
          description={
            all.length === 0
              ? "When a customer requests or books a slot on one of your published venues, it will appear here with the details needed to decide."
              : "No bookings match this filter. Try another status or view all bookings."
          }
          action={
            all.length === 0 ? (
              <ButtonLink href="/owner/venues" variant="secondary">
                Review your listings
              </ButtonLink>
            ) : (
              <ButtonLink href="/owner/bookings" variant="secondary">
                View all bookings
              </ButtonLink>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link
                href={`/owner/bookings/${booking.id}`}
                className="group block rounded-[var(--radius-md)] border border-border bg-surface p-4 transition-shadow hover:shadow-[var(--shadow-md)] sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={booking.status}
                        label={BOOKING_STATUS_LABELS[booking.status]}
                        tone={bookingStatusTone(booking.status)}
                      />
                      <StatusBadge
                        status={booking.payment_status}
                        label={PAYMENT_STATUS_LABELS[booking.payment_status]}
                        tone={paymentTone(booking.payment_status)}
                      />
                    </div>

                    <h2 className="mt-2 font-display text-base font-semibold tracking-[-0.02em] text-foreground group-hover:text-primary">
                      {booking.customer_name || booking.customer_email}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">{booking.customer_email}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDateTime(booking.starts_at)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {booking.venue_name}
                      </span>
                      {booking.guest_count ? (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          {booking.guest_count} guests
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1.5 text-[0.68rem] text-muted">
                      {booking.reference}
                      {booking.event_type ? ` · ${booking.event_type}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="text-base font-semibold text-foreground tabular">
                      {formatMoney(booking.total_paise)}
                    </p>
                    <span className="inline-flex items-center gap-0.5 text-[0.68rem] font-medium text-muted group-hover:text-primary">
                      {booking.status === "pending_owner_approval" ? "Review request" : "View details"}
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
