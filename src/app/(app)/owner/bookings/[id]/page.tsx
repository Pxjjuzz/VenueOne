import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import {
  getBookingForOwner,
  getBookingStatusHistory,
  getCancellationForBooking,
  listBookingPayments,
} from "@/lib/booking/queries";
import { PageHeader } from "@/components/ui/page-header";
import { InfoRow, Panel } from "@/components/ui/stat-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { OwnerBookingDecision } from "@/components/owner/owner-booking-decision";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatIstDateLong, formatIstTime } from "@/lib/time";
import {
  BOOKING_STATUS_LABELS,
  CANCELLATION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  bookingStatusTone,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Booking request",
  robots: { index: false, follow: false },
};

function paymentTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "processing") return "warning" as const;
  if (status === "refunded" || status === "partially_refunded") return "info" as const;
  return "neutral" as const;
}

function cancellationTone(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "withdrawn") return "neutral" as const;
  return "warning" as const;
}

export default async function OwnerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const user = await requireOwner();
  const booking = await getBookingForOwner(id, user.id);
  if (!booking) notFound();

  const [history, payments, cancellation] = await Promise.all([
    getBookingStatusHistory(booking.id),
    listBookingPayments(booking.id),
    getCancellationForBooking(booking.id),
  ]);

  const snapshot = booking.pricing_snapshot as Record<string, unknown>;
  const slotLabel =
    typeof snapshot.slotLabel === "string"
      ? snapshot.slotLabel
      : typeof snapshot.label === "string"
        ? snapshot.label
        : null;

  return (
    <div className="space-y-6">
      <Link
        href="/owner/bookings"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        All booking requests
      </Link>

      <PageHeader
        eyebrow={`Booking ${booking.reference}`}
        title={booking.venue_name}
        description={`${formatIstDateLong(booking.starts_at)}, ${formatIstTime(booking.starts_at)} – ${formatIstTime(booking.ends_at)}`}
        actions={
          <div className="flex flex-wrap gap-2">
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
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-6">
          {booking.status === "pending_owner_approval" ? (
            <Panel
              title="Decide this request"
              description="The slot is held while you decide"
            >
              <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-warning/30 bg-warning-soft px-3.5 py-3 text-xs leading-relaxed text-warning">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  Accepting opens a payment window for the customer. Declining releases
                  the held slot immediately. Neither action charges the customer.
                </p>
              </div>
              <OwnerBookingDecision bookingId={booking.id} reference={booking.reference} />
            </Panel>
          ) : null}

          {booking.status === "confirmed" ? (
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-success/30 bg-success-soft px-4 py-4 text-sm leading-relaxed text-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Confirmed and paid</p>
                <p className="mt-1 text-success/90">
                  The payment was verified by the server. Coordinate arrival details
                  directly with the customer.
                </p>
              </div>
            </div>
          ) : null}

          {booking.decision_note ? (
            <Panel title="Your recorded note" description="Included in the decision notification">
              <p className="text-sm leading-relaxed text-muted-strong">
                {booking.decision_note}
              </p>
              {booking.decided_at ? (
                <p className="mt-2 text-[0.68rem] text-muted">
                  Recorded {formatDateTime(booking.decided_at)}
                </p>
              ) : null}
            </Panel>
          ) : null}

          <Panel title="Booking details" description="As recorded on the server">
            <dl className="divide-y divide-border">
              <InfoRow label="Reference" value={booking.reference} />
              <InfoRow label="Venue" value={booking.venue_name} />
              {slotLabel ? <InfoRow label="Slot" value={slotLabel} /> : null}
              <InfoRow
                label="Date and time"
                value={`${formatIstDateLong(booking.starts_at)}, ${formatIstTime(booking.starts_at)} – ${formatIstTime(booking.ends_at)}`}
              />
              {booking.guest_count ? (
                <InfoRow label="Guests" value={String(booking.guest_count)} />
              ) : null}
              {booking.event_type ? (
                <InfoRow label="Occasion" value={booking.event_type} />
              ) : null}
              {booking.notes ? <InfoRow label="Customer notes" value={booking.notes} /> : null}
              <InfoRow label="Requested" value={formatDateTime(booking.created_at)} />
              {booking.hold_expires_at && booking.status === "awaiting_payment" ? (
                <InfoRow
                  label="Payment window closes"
                  value={formatDateTime(booking.hold_expires_at)}
                />
              ) : null}
            </dl>
          </Panel>

          <Panel title="Price breakdown" description="Calculated by the server at booking time">
            <dl className="divide-y divide-border">
              <InfoRow label="Subtotal" value={formatMoney(booking.subtotal_paise)} />
              <InfoRow label="Platform fee" value={formatMoney(booking.fee_paise)} />
              <InfoRow label="Tax" value={formatMoney(booking.tax_paise)} />
              <InfoRow
                label="Total"
                value={
                  <span className="font-semibold text-foreground">
                    {formatMoney(booking.total_paise)}
                  </span>
                }
              />
            </dl>
          </Panel>

          <Panel title="Status history" description="Transitions recorded on this booking">
            {history.length === 0 ? (
              <p className="text-sm text-muted">No status transitions recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {BOOKING_STATUS_LABELS[
                          entry.to_status as keyof typeof BOOKING_STATUS_LABELS
                        ] ?? entry.to_status}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateTime(entry.created_at)}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer" description="Contact details for coordination">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">Name</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {booking.customer_name || "Not provided"}
                </dd>
              </div>
              <div className="flex items-start gap-2 text-muted-strong">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a href={`mailto:${booking.customer_email}`} className="break-all hover:text-foreground">
                  {booking.customer_email}
                </a>
              </div>
              {booking.customer_phone ? (
                <div className="flex items-start gap-2 text-muted-strong">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`tel:${booking.customer_phone}`} className="hover:text-foreground">
                    {booking.customer_phone}
                  </a>
                </div>
              ) : null}
              {booking.guest_count ? (
                <div className="flex items-start gap-2 text-muted-strong">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {booking.guest_count} guests
                </div>
              ) : null}
            </dl>
            <p className="mt-4 border-t border-border pt-3 text-[0.68rem] leading-relaxed text-muted">
              Contact details are shown because this booking is on a venue you own. Do
              not use them for unrelated marketing.
            </p>
          </Panel>

          <Panel title="Venue" description="Your listing">
            <ul className="space-y-2.5 text-sm text-muted-strong">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {booking.venue_address_line}, {booking.venue_city}, {booking.venue_state}
              </li>
              {booking.venue_contact_phone ? (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {booking.venue_contact_phone}
                </li>
              ) : null}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink
                href={`/owner/venues/${booking.venue_id}`}
                variant="secondary"
                size="sm"
              >
                Manage venue
              </ButtonLink>
              {booking.venue_slug ? (
                <ButtonLink
                  href={`/venues/${booking.venue_slug}`}
                  variant="ghost"
                  size="sm"
                >
                  Public page
                </ButtonLink>
              ) : null}
            </div>
          </Panel>

          {cancellation ? (
            <Panel
              title="Cancellation"
              description={`Requested ${formatDateTime(cancellation.created_at)}`}
              actions={
                <Badge tone={cancellationTone(cancellation.status)}>
                  {CANCELLATION_STATUS_LABELS[cancellation.status]}
                </Badge>
              }
            >
              <p className="text-sm leading-relaxed text-muted-strong">{cancellation.reason}</p>
              <dl className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted">
                <div className="flex justify-between gap-3">
                  <dt>Calculated refund</dt>
                  <dd className="font-medium text-foreground tabular">
                    {formatMoney(cancellation.refund_amount_paise)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Refund percentage</dt>
                  <dd className="font-medium text-foreground tabular">
                    {cancellation.refund_percent}%
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.68rem] leading-relaxed text-muted">
                Cancellation requests are reviewed by platform administrators under the
                booking&apos;s saved policy. Refund completion is confirmed by the payment
                provider.
              </p>
            </Panel>
          ) : null}

          {payments.length > 0 ? (
            <Panel title="Payment records" description="Server-side transaction log">
              <ul className="space-y-3">
                {payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="border-b border-border/70 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground tabular">
                        {formatMoney(payment.amount_paise)}
                      </p>
                      <Badge
                        tone={
                          payment.status === "captured"
                            ? "success"
                            : payment.status === "failed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {payment.provider === "demo" ? "Demo payment" : "Razorpay"}
                      {payment.is_demo ? " · simulated" : ""} ·{" "}
                      {formatDateTime(payment.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-3 text-[0.68rem] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            This page is scoped to bookings on venues owned by your signed-in account.
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Dates and times are shown in India Standard Time.
          </div>
        </div>
      </div>
    </div>
  );
}
