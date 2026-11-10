import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Plus,
  Store,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listCustomerBookings } from "@/lib/booking/queries";
import { listNotifications } from "@/lib/notifications";
import { StatCard, MetricRow, Panel } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { BookingMiniRow } from "@/components/booking/booking-summary-card";
import { formatDateTime, formatMoney, pluralize } from "@/lib/format";
import { formatIstDate, nowMs } from "@/lib/time";

export const metadata: Metadata = { title: "Your dashboard", robots: { index: false, follow: false } };

export default async function CustomerDashboardPage() {
  const user = await requireUser("/dashboard");
  const [bookings, notifications] = await Promise.all([
    listCustomerBookings(user.id),
    listNotifications(user.id, 5),
  ]);

  const now = nowMs();
  const upcoming = bookings
    .filter(
      (booking) =>
        booking.starts_at.getTime() > now &&
        ["confirmed", "awaiting_payment", "pending_owner_approval"].includes(booking.status),
    )
    .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
  const pending = bookings.filter((booking) => booking.status === "pending_owner_approval");
  const awaitingPayment = bookings.filter((booking) => booking.status === "awaiting_payment");
  const confirmedSpend = bookings
    .filter((booking) => booking.payment_status === "paid")
    .reduce((sum, booking) => sum + booking.total_paise, 0);
  const nextBooking = upcoming[0];
  const recent = bookings.slice(0, 4);
  const unread = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your account"
        title={user.fullName ? `Welcome back, ${user.fullName.split(" ")[0]}.` : "Your dashboard"}
        description="Track booking requests, complete payments and find the details you need for each reservation."
        actions={
          <ButtonLink href="/halls" size="sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New booking
          </ButtonLink>
        }
      />

      <MetricRow>
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          hint="Confirmed or still in progress"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatCard
          label="Awaiting owner"
          value={pending.length}
          hint="Requests the venue has not decided yet"
          tone={pending.length ? "warning" : "neutral"}
          icon={<Clock3 className="h-4 w-4" />}
        />
        <StatCard
          label="Awaiting payment"
          value={awaitingPayment.length}
          hint="Payment windows close automatically"
          tone={awaitingPayment.length ? "warning" : "neutral"}
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Paid to date"
          value={formatMoney(confirmedSpend)}
          hint="Captured payments, excluding refunds"
          icon={<Wallet className="h-4 w-4" />}
        />
      </MetricRow>

      {bookings.length === 0 ? (
        <EmptyState
          variant="booking"
          title="No bookings yet"
          description="When you request or book a hall or ground, it will appear here with its status, payment state and cancellation options."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/halls">
                Browse community halls
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/grounds" variant="secondary">
                Browse grounds
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            {nextBooking ? (
              <Panel
                title="Next booking"
                description={
                  nextBooking.status === "confirmed"
                    ? "This reservation is confirmed. Keep the reference handy."
                    : "This reservation is still moving through approval or payment."
                }
                actions={
                  <Link
                    href={`/dashboard/bookings/${nextBooking.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4"
                  >
                    Open booking <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                }
              >
                <p className="font-display text-2xl font-semibold tracking-[-0.035em] text-foreground">
                  {nextBooking.venue_name}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatIstDate(nextBooking.starts_at)} · {nextBooking.venue_city}
                </p>
                <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">Reference</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{nextBooking.reference}</p>
                  </div>
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">Total</p>
                    <p className="mt-1 text-sm font-medium text-foreground tabular">
                      {formatMoney(nextBooking.total_paise)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">Starts</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {formatDateTime(nextBooking.starts_at)}
                    </p>
                  </div>
                </div>
              </Panel>
            ) : null}

            <Panel
              title="Recent bookings"
              description={`${pluralize(bookings.length, "booking")} on this account`}
              actions={
                <Link
                  href="/dashboard/bookings"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4"
                >
                  View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              }
              bodyClassName="p-0 sm:p-0"
            >
              <div className="divide-y divide-border">
                {recent.map((booking) => (
                  <div key={booking.id} className="px-4 py-3 sm:px-5">
                    <div className="[&>a]:border-0 [&>a]:py-0">
                      <BookingMiniRow booking={booking} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel
              title="Notifications"
              description={unread ? `${unread} unread` : "You are up to date"}
              actions={
                <Link
                  href="/dashboard/notifications"
                  className="text-xs font-medium text-primary underline underline-offset-4"
                >
                  Open
                </Link>
              }
            >
              {notifications.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted">
                  Booking decisions, payment updates and cancellation outcomes will
                  appear here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{notification.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {user.ownerStatus === "approved" ? (
              <Panel title="Venue owner tools" description="You have approved owner access.">
                <p className="text-sm leading-relaxed text-muted">
                  Manage listings, publish new venues and respond to booking requests.
                </p>
                <ButtonLink href="/owner" variant="secondary" size="sm" className="mt-4">
                  <Store className="h-4 w-4" aria-hidden="true" />
                  Open owner dashboard
                </ButtonLink>
              </Panel>
            ) : (
              <Panel title="Have a venue to list?" description="Owner access is a separate approval.">
                <p className="text-sm leading-relaxed text-muted">
                  Apply once for owner access, then submit each hall or ground for its
                  own publication review.
                </p>
                <ButtonLink href="/list-your-venue" variant="secondary" size="sm" className="mt-4">
                  Learn about listing
                </ButtonLink>
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
