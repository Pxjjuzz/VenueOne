import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import {
  getBookingForCustomer,
  getBookingStatusHistory,
  getCancellationForBooking,
  listBookingPayments,
  listRefundsForBooking,
} from "@/lib/booking/queries";
import { paymentDisplayMode } from "@/lib/payments/service";
import { calculateRefund, describePolicy, parseCancellationPolicy } from "@/lib/policies";
import { Panel, InfoRow } from "@/components/ui/stat-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { BookingPaymentPanel } from "@/components/booking/payment-panel";
import {
  CancellationRequestForm,
  WithdrawCancellationForm,
} from "@/components/booking/cancellation-panel";
import { formatDateTime, formatMoney } from "@/lib/format";
import { formatIstDateLong, formatIstTime } from "@/lib/time";
import {
  BOOKING_STATUS_LABELS,
  CANCELLATION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  REFUND_STATUS_LABELS,
  bookingStatusTone,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Booking details",
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

export default async function AppBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-secondary text-muted">
          <LogIn className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
          Sign in to open this booking
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          Booking details include payment records, so they are only shown to the
          account that made the booking.
        </p>
        <Link
          href={`/auth/sign-in?next=${encodeURIComponent(`/app/bookings/${id}`)}`}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Sign in
        </Link>
      </div>
    );
  }

  const booking = await getBookingForCustomer(id, user.id);

  if (!booking) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-secondary text-muted">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
          Booking not found
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          This booking does not belong to your account, or it no longer exists.
        </p>
        <Link
          href="/app/bookings"
          className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Back to my bookings
        </Link>
      </div>
    );
  }

  const [history, payments, cancellation, refunds] = await Promise.all([
    getBookingStatusHistory(booking.id),
    listBookingPayments(booking.id),
    getCancellationForBooking(booking.id),
    listRefundsForBooking(booking.id),
  ]);

  const policy = parseCancellationPolicy(booking.cancellation_policy_snapshot);
  const policyLines = describePolicy(policy);
  const now = new Date();
  const startsInFuture = booking.starts_at.getTime() > now.getTime();
  const hasCapturedPayment =
    booking.payment_status === "paid" || booking.payment_status === "partially_refunded";
  const refundPreview = hasCapturedPayment
    ? calculateRefund({
        policy,
        startsAt: booking.starts_at,
        now,
        totalPaise: booking.total_paise,
      })
    : null;
  const canRequestCancellation =
    !cancellation && startsInFuture && booking.status === "confirmed";
  const paymentMode = paymentDisplayMode();
  const showVenueContact =
    booking.status === "confirmed" || booking.status === "awaiting_payment";

  const snapshot = booking.pricing_snapshot as Record<string, unknown>;
  const snapshotLabel =
    typeof snapshot.slotLabel === "string"
      ? snapshot.slotLabel
      : typeof snapshot.label === "string"
        ? snapshot.label
        : null;

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur">
        <Link
          href="/app/bookings"
          aria-label="Back to my bookings"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground-soft hover:bg-surface-secondary"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">
            {booking.reference}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {booking.venue_name}
          </p>
        </div>
      </header>

      <div className="px-4 pt-4">
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

        <h1 className="mt-3 font-display text-[1.5rem] font-semibold leading-tight tracking-[-0.035em] text-foreground">
          {booking.venue_name}
        </h1>
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {formatIstDateLong(booking.starts_at)}, {formatIstTime(booking.starts_at)} –{" "}
          {formatIstTime(booking.ends_at)}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {booking.venue_city}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted">
              Total
            </p>
            <p className="mt-0.5 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground tabular">
              {formatMoney(booking.total_paise)}
            </p>
          </div>
          <Link
            href={`/app/venues/${booking.venue_slug}`}
            className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold text-foreground-soft"
          >
            View venue
          </Link>
        </div>

        {booking.status === "awaiting_payment" ? (
          <div className="mt-4">
            <BookingPaymentPanel
              bookingId={booking.id}
              reference={booking.reference}
              totalPaise={booking.total_paise}
              paymentMode={paymentMode.mode}
              testMode={paymentMode.testMode}
            />
          </div>
        ) : null}

        {booking.status === "awaiting_payment" && booking.hold_expires_at ? (
          <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-secondary/60 px-3.5 py-2.5 text-xs leading-relaxed text-muted">
            <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            Payment window closes {formatDateTime(booking.hold_expires_at)}. If it
            closes, the slot is released automatically.
          </p>
        ) : null}

        {booking.status === "pending_owner_approval" ? (
          <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning-soft px-4 py-3.5 text-sm leading-relaxed text-warning">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Waiting for the venue owner</p>
              <p className="mt-1">
                The slot is held while the venue reviews this request. If it is
                accepted, a payment window opens. If it is declined, no payment is due.
              </p>
            </div>
          </div>
        ) : null}

        {booking.status === "confirmed" ? (
          <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-success/30 bg-success-soft px-4 py-3.5 text-sm leading-relaxed text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Booking confirmed</p>
              <p className="mt-1 text-success/90">
                The server recorded a verified payment. Keep reference{" "}
                {booking.reference} available and contact the venue for arrival
                details.
              </p>
            </div>
          </div>
        ) : null}

        {booking.status === "rejected" ? (
          <div className="mt-4 rounded-[var(--radius-md)] border border-error/30 bg-error-soft px-4 py-3.5 text-sm leading-relaxed text-error">
            <p className="font-semibold">Request not accepted by the venue</p>
            <p className="mt-1">
              {booking.decision_note || "The venue could not accept this requested slot."}{" "}
              No payment is due.
            </p>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {showVenueContact ? (
            <Panel
              title="Venue contact"
              description="Shared after the venue accepts the booking"
            >
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-start gap-2.5 text-muted-strong">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {booking.venue_address_line}, {booking.venue_city},{" "}
                  {booking.venue_state}
                </li>
                {booking.venue_contact_phone ? (
                  <li className="flex items-start gap-2.5 text-muted-strong">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <a href={`tel:${booking.venue_contact_phone}`} className="underline underline-offset-4">
                      {booking.venue_contact_phone}
                    </a>
                  </li>
                ) : null}
                {booking.venue_contact_email ? (
                  <li className="flex items-start gap-2.5 text-muted-strong">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <a href={`mailto:${booking.venue_contact_email}`} className="break-all underline underline-offset-4">
                      {booking.venue_contact_email}
                    </a>
                  </li>
                ) : null}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Booking details" description="Saved with this booking">
            <dl className="divide-y divide-border">
              <InfoRow label="Reference" value={booking.reference} />
              <InfoRow
                label="Category"
                value={booking.venue_category === "hall" ? "Community hall" : "Community ground"}
              />
              {snapshotLabel ? <InfoRow label="Slot" value={snapshotLabel} /> : null}
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
              {booking.notes ? <InfoRow label="Notes" value={booking.notes} /> : null}
              <InfoRow label="Requested" value={formatDateTime(booking.created_at)} />
              {booking.decision_note ? (
                <InfoRow label="Venue note" value={booking.decision_note} />
              ) : null}
            </dl>
          </Panel>

          <Panel title="Price breakdown" description="Amounts recorded by the server">
            <dl className="divide-y divide-border">
              <InfoRow label="Booking subtotal" value={formatMoney(booking.subtotal_paise)} />
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
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Calculated from approved pricing and platform settings when the booking
              was created, never from the browser.
            </p>
          </Panel>

          {cancellation ? (
            <Panel
              title="Cancellation request"
              description={`Submitted ${formatDateTime(cancellation.created_at)}`}
              actions={
                <StatusBadge
                  status={cancellation.status}
                  label={CANCELLATION_STATUS_LABELS[cancellation.status]}
                  tone={cancellationTone(cancellation.status)}
                />
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
                {cancellation.admin_note ? (
                  <div className="flex justify-between gap-3">
                    <dt>Administrator note</dt>
                    <dd className="text-right text-foreground">{cancellation.admin_note}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Approval and refund are separate. A refund is complete only after the
                payment provider confirms it.
              </p>
              {cancellation.status === "requested" ? (
                <div className="mt-3">
                  <WithdrawCancellationForm
                    cancellationId={cancellation.id}
                    bookingId={booking.id}
                  />
                </div>
              ) : null}
            </Panel>
          ) : null}

          {canRequestCancellation ? (
            <Panel title="Cancel this booking" description="Reviewed under the saved policy">
              <CancellationRequestForm
                bookingId={booking.id}
                estimatedRefundPaise={refundPreview?.amountPaise ?? 0}
                hasCapturedPayment={hasCapturedPayment}
                eligible={Boolean(refundPreview?.allowed && refundPreview.amountPaise > 0)}
                deadlineLabel={`Requests close ${policy.cancellationDeadlineHours} hours before the start.`}
              />
            </Panel>
          ) : null}

          <Panel title="Cancellation policy" description="Saved with this booking">
            <ul className="space-y-2 text-xs leading-relaxed text-muted">
              {policyLines.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/refund-policy"
              className="mt-2 inline-block text-xs font-medium text-primary underline underline-offset-4"
            >
              Read the full policy
            </Link>
          </Panel>

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
                    {payment.provider_payment_id ? (
                      <p className="mt-0.5 break-all text-[0.68rem] text-muted">
                        Payment ID: {payment.provider_payment_id}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {refunds.length > 0 ? (
            <Panel title="Refunds" description="Provider-confirmed states only">
              <ul className="space-y-3">
                {refunds.map((refund) => (
                  <li
                    key={refund.id}
                    className="border-b border-border/70 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground tabular">
                        {formatMoney(refund.amount_paise)}
                      </p>
                      <Badge
                        tone={
                          refund.status === "processed"
                            ? "success"
                            : refund.status === "failed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {REFUND_STATUS_LABELS[refund.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {refund.processed_at
                        ? `Processed ${formatDateTime(refund.processed_at)}`
                        : `Created ${formatDateTime(refund.created_at)}`}
                      {refund.is_demo ? " · Demo refund" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Status history" description="Recorded transitions, newest last">
            {history.length === 0 ? (
              <p className="text-sm text-muted">No status transitions recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
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

        <p className="mt-4 flex items-start gap-1.5 px-1 text-[0.68rem] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          This page only loads the booking because it belongs to your signed-in
          account. A different account cannot open it by changing the URL.
        </p>

        <p className="mt-2 flex items-center gap-1.5 px-1 text-[0.68rem] text-muted">
          <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
          Payment is confirmed on the server before a booking is marked paid.
        </p>
      </div>
    </div>
  );
}
