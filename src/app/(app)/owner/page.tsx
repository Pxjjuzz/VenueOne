import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Plus,
  Store,
} from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import { listOwnerBookings } from "@/lib/booking/queries";
import { listOwnerVenues } from "@/lib/venues/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricRow, Panel, StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CreateVenueForm } from "@/components/owner/create-venue-form";
import { formatDateTime, formatMoney, pluralize } from "@/lib/format";
import { nowMs } from "@/lib/time";
import {
  BOOKING_STATUS_LABELS,
  VENUE_STATUS_LABELS,
  bookingStatusTone,
  venueStatusTone,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Owner overview",
  robots: { index: false, follow: false },
};

export default async function OwnerDashboardPage() {
  const user = await requireOwner();
  const [venues, bookings] = await Promise.all([
    listOwnerVenues(user.id),
    listOwnerBookings(user.id),
  ]);

  const now = nowMs();
  const pending = bookings.filter((booking) => booking.status === "pending_owner_approval");
  const upcoming = bookings
    .filter(
      (booking) =>
        booking.starts_at.getTime() > now &&
        (booking.status === "confirmed" || booking.status === "awaiting_payment"),
    )
    .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
  const collected = bookings
    .filter((booking) => booking.payment_status === "paid")
    .reduce((sum, booking) => sum + booking.total_paise, 0);
  const published = venues.filter((venue) => venue.status === "approved");
  const inReview = venues.filter(
    (venue) => venue.status === "submitted" || venue.status === "under_review",
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Venue owner"
        title={user.fullName ? `Your owner workspace, ${user.fullName.split(" ")[0]}.` : "Your owner workspace"}
        description="Keep listings current, answer booking requests and keep an eye on the slots that are already committed."
        actions={
          <>
            <CreateVenueForm label="New venue" />
            <ButtonLink href="/owner/bookings" variant="secondary" size="sm">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Booking requests
            </ButtonLink>
          </>
        }
      />

      <MetricRow>
        <StatCard
          label="Published"
          value={published.length}
          hint={`${pluralize(venues.length, "venue")} in total`}
          tone={published.length ? "success" : "neutral"}
          icon={<BadgeCheck className="h-4 w-4" />}
        />
        <StatCard
          label="In review"
          value={inReview.length}
          hint="Waiting on publication approval"
          tone={inReview.length ? "warning" : "neutral"}
          icon={<Clock3 className="h-4 w-4" />}
        />
        <StatCard
          label="Decisions needed"
          value={pending.length}
          hint="Requests with a held slot"
          tone={pending.length ? "warning" : "neutral"}
          icon={<CalendarCheck2 className="h-4 w-4" />}
        />
        <StatCard
          label="Collected"
          value={formatMoney(collected)}
          hint="Captured payments across your venues"
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
      </MetricRow>

      {venues.length === 0 ? (
        <EmptyState
          variant="venue"
          title="No venues yet"
          description="Create a draft, add real photographs and submit it for publication review. Nothing appears in the public directory until a reviewer approves it."
          action={<CreateVenueForm label="Create your first venue" />}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <Panel
              title="Requests awaiting your decision"
              description={
                pending.length
                  ? "The slot is held while a request waits. Accepting opens a payment window; declining releases it."
                  : "No requests are waiting on you."
              }
              actions={
                <Link
                  href="/owner/bookings?status=pending_owner_approval"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4"
                >
                  Open queue <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              }
              bodyClassName={pending.length ? "p-0 sm:p-0" : undefined}
            >
              {pending.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted">
                  New requests will appear here as soon as a customer selects a slot on
                  one of your published venues.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {pending.slice(0, 5).map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/owner/bookings/${booking.id}`}
                        className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary/60 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {booking.customer_name || booking.customer_email}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {booking.venue_name} · {formatDateTime(booking.starts_at)}
                          </p>
                          <p className="mt-0.5 text-[0.68rem] text-muted">
                            {booking.reference} · {booking.guest_count ?? "—"} guests
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-foreground tabular">
                            {formatMoney(booking.total_paise)}
                          </p>
                          <StatusBadge
                            status={booking.status}
                            label={BOOKING_STATUS_LABELS[booking.status]}
                            tone={bookingStatusTone(booking.status)}
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Upcoming bookings"
              description="Confirmed and awaiting-payment reservations on your venues."
              actions={
                <Link
                  href="/owner/bookings"
                  className="text-xs font-medium text-primary underline underline-offset-4"
                >
                  All bookings
                </Link>
              }
              bodyClassName={upcoming.length ? "p-0 sm:p-0" : undefined}
            >
              {upcoming.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted">
                  Nothing is scheduled yet. Confirmed bookings appear here with their
                  customer and payment state.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.slice(0, 6).map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/owner/bookings/${booking.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary/60 sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {booking.venue_name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {formatDateTime(booking.starts_at)} · {booking.reference}
                          </p>
                        </div>
                        <StatusBadge
                          status={booking.status}
                          label={BOOKING_STATUS_LABELS[booking.status]}
                          tone={bookingStatusTone(booking.status)}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel
              title="Your venues"
              description={`${pluralize(venues.length, "listing")}`}
              actions={
                <Link
                  href="/owner/venues"
                  className="text-xs font-medium text-primary underline underline-offset-4"
                >
                  Manage
                </Link>
              }
              bodyClassName="p-0 sm:p-0"
            >
              <ul className="divide-y divide-border">
                {venues.slice(0, 5).map((venue) => (
                  <li key={venue.id}>
                    <Link
                      href={`/owner/venues/${venue.id}`}
                      className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-secondary/60 sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {venue.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {venue.category === "hall" ? "Community hall" : "Community ground"}
                          {venue.city ? ` · ${venue.city}` : ""}
                        </p>
                      </div>
                      <StatusBadge
                        status={venue.status}
                        label={VENUE_STATUS_LABELS[venue.status]}
                        tone={venueStatusTone(venue.status)}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="How publishing works" description="Two independent decisions">
              <ol className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.62rem] font-bold text-primary">
                    1
                  </span>
                  <p className="text-xs leading-relaxed text-muted">
                    Owner access is approved. You can now create drafts and upload
                    real photographs.
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.62rem] font-bold text-primary">
                    2
                  </span>
                  <p className="text-xs leading-relaxed text-muted">
                    Submit each venue. Reviewers check the content, photographs,
                    pricing and hours before it is published.
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.62rem] font-bold text-primary">
                    3
                  </span>
                  <p className="text-xs leading-relaxed text-muted">
                    After publication, editorial edits go back through review. Blocking
                    maintenance time does not.
                  </p>
                </li>
              </ol>
              <ButtonLink href="/how-it-works" variant="secondary" size="sm" className="mt-4">
                Read the venue guide
              </ButtonLink>
            </Panel>

            <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">Need another venue?</p>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Accounts can manage multiple halls and grounds, each with its own
                publication review.
              </p>
              <div className="mt-3">
                <CreateVenueForm label="Create a draft" size="sm" variant="secondary" />
              </div>
            </div>

            <Link
              href="/halls"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              See how your listings appear in the public directory
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
