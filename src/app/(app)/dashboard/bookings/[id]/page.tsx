import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import {
  getBookingForCustomer,
  getBookingStatusHistory,
  getCancellationForBooking,
  listBookingPayments,
  listRefundsForBooking,
} from "@/lib/booking/queries";
import { paymentDisplayMode } from "@/lib/payments/service";
import { calculateRefund, describePolicy, parseCancellationPolicy } from "@/lib/policies";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, InfoRow } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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

export const metadata: Metadata = { title: "Booking details", robots: { index: false, follow: false } };

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

export default async function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/bookings/${id}`);
  const booking = await getBookingForCustomer(id, user.id);
  if (!booking) notFound();

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
    <div className="space-y-6">
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        All bookings
      </Link>

      <PageHeader
        eyebrow={`Booking ${booking.reference}`}
        title={booking.venue_name}
        description={`${formatIstDateLong(booking.starts_at)}, ${formatIstTime(booking.starts_at)} – ${formatIstTime(booking.ends_at)} · ${booking.venue_city}`}
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

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
        <div className="space-y-6">
          {booking.status === "awaiting_payment" ? (
            <BookingPaymentPanel
              bookingId={booking.id}
              reference={booking.reference}
              totalPaise={booking.total_paise}
              paymentMode={paymentMode.mode}
              testMode={paymentMode.testMode}
            />
          ) : null}

          {booking.status === "pending_owner_approval" ? (
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning-soft px-4 py-4 text-sm leading-relaxed text-warning">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Waiting for the venue owner</p>
                <p className="mt-1">
                  The slot is held while the venue reviews this request. If it is accepted,
                  a payment window opens; if it is declined, no payment is due. Cancellation
                  becomes available once the booking is confirmed.
                </p>
              </div>
            </div>
          ) : null}

          {booking.status === "awaiting_payment" && booking.hold_expires_at ? (
            <p className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-secondary/60 px-3.5 py-2.5 text-xs text-muted">
              <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              Payment window closes {formatDateTime(booking.hold_expires_at)}. If it closes,
              the slot is released automatically.
            </p>
          ) : null}

          {booking.status === "confirmed" ? (
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-success/30 bg-success-soft px-4 py-4 text-sm leading-relaxed text-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Booking confirmed</p>
                <p className="mt-1 text-success/90">
                  The server recorded a verified payment. Keep reference {booking.reference}{" "}
                  available and contact the venue directly for arrival details.
                </p>
              </div>
            </div>
          ) : null}

          {booking.status === "rejected" ? (
            <div className="rounded-[var(--radius-md)] border border-error/30 bg-error-soft px-4 py-4 text-sm leading-relaxed text-error">
              <p className="font-semibold">Request not accepted by the venue</p>
              <p className="mt-1">
                {booking.decision_note || "The venue could not accept this requested slot."} No
                payment is due. You can book another slot or venue.
              </p>
            </div>
          ) : null}

          <Panel title="Booking details" description="Saved with this booking">
            <dl className="divide-y divide-border">
              <InfoRow label="Reference" value={booking.reference} />
              <InfoRow label="Venue" value={booking.venue_name} />
              <InfoRow label="Category" value={booking.venue_category === "hall" ? "Community hall" : "Community ground"} />
              {snapshotLabel ? <InfoRow label="Slot" value={snapshotLabel} /> : null}
              <InfoRow
                label="Date and time"
                value={`${formatIstDateLong(booking.starts_at)}, ${formatIstTime(booking.starts_at)} – ${formatIstTime(booking.ends_at)}`}
              />
              {booking.guest_count ? <InfoRow label="Guests" value={String(booking.guest_count)} /> : null}
              {booking.event_type ? <InfoRow label="Occasion" value={booking.event_type} /> : null}
              {booking.notes ? <InfoRow label="Notes" value={booking.notes} /> : null}
              <InfoRow label="Requested" value={formatDateTime(booking.created_at)} />
              {booking.decided_at ? (
                <InfoRow label="Owner decision" value={formatDateTime(booking.decided_at)} />
              ) : null}
              {booking.decision_note ? <InfoRow label="Owner note" value={booking.decision_note} /> : null}
            </dl>
          </Panel>

          <Panel title="Price breakdown" description="Amounts recorded by the server">
            <dl className="divide-y divide-border">
              <InfoRow label="Booking subtotal" value={formatMoney(booking.subtotal_paise)} />
              <InfoRow label="Platform fee" value={formatMoney(booking.fee_paise)} />
              <InfoRow label="Tax" value={formatMoney(booking.tax_paise)} />
              <InfoRow
                label="Total"
                value={<span className="font-semibold text-foreground">{formatMoney(booking.total_paise)}</span>}
              />
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              The total is calculated from the approved pricing and platform settings at the
              time the booking was created. It is not taken from the browser.
            </p>
          </Panel>

          <Panel title="Status history" description="Recorded transitions, newest last">
            {history.length === 0 ? (
              <p className="text-sm text-muted">No status transitions have been recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {BOOKING_STATUS_LABELS[entry.to_status as keyof typeof BOOKING_STATUS_LABELS] ??
                          entry.to_status}
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
          {showVenueContact ? (
            <Panel title="Venue contact" description="Shared after the venue accepts the booking">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5 text-muted-strong">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {booking.venue_address_line}, {booking.venue_city}, {booking.venue_state}
                </li>
                {booking.venue_contact_phone ? (
                  <li className="flex items-start gap-2.5 text-muted-strong">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <a href={`tel:${booking.venue_contact_phone}`} className="hover:text-foreground">
                      {booking.venue_contact_phone}
                    </a>
                  </li>
                ) : null}
                {booking.venue_contact_email ? (
                  <li className="flex items-start gap-2.5 text-muted-strong">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <a href={`mailto:${booking.venue_contact_email}`} className="hover:text-foreground">
                      {booking.venue_contact_email}
                    </a>
                  </li>
                ) : null}
              </ul>
              <ButtonLink
                href={`/venues/${booking.venue_slug}`}
                variant="secondary"
                size="sm"
                className="mt-4"
              >
                View venue page
              </ButtonLink>
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
              className="mt-3 inline-block text-xs font-medium text-primary underline underline-offset-4"
            >
              Read the full cancellation and refund policy
            </Link>
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
              <dl className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-muted">
                <div className="flex justify-between gap-3">
                  <dt>Calculated refund</dt>
                  <dd className="font-medium text-foreground tabular">
                    {formatMoney(cancellation.refund_amount_paise)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Refund percentage</dt>
                  <dd className="font-medium text-foreground tabular">{cancellation.refund_percent}%</dd>
                </div>
                {cancellation.admin_note ? (
                  <div className="flex justify-between gap-3">
                    <dt>Administrator note</dt>
                    <dd className="text-right text-foreground">{cancellation.admin_note}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Approval and refund are separate. A refund is only complete after the payment
                provider confirms it.
              </p>
              {cancellation.status === "requested" ? (
                <div className="mt-4">
                  <WithdrawCancellationForm
                    cancellationId={cancellation.id}
                    bookingId={booking.id}
                  />
                </div>
              ) : null}
            </Panel>
          ) : null}

          {refunds.length > 0 ? (
            <Panel title="Refunds" description="Provider-confirmed states only">
              <ul className="space-y-3">
                {refunds.map((refund) => (
                  <li key={refund.id} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
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

          {payments.length > 0 ? (
            <Panel title="Payment records" description="Server-side transaction log">
              <ul className="space-y-3">
                {payments.map((payment) => (
                  <li key={payment.id} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground tabular">
                        {formatMoney(payment.amount_paise)}
                      </p>
                      <Badge tone={payment.status === "captured" ? "success" : payment.status === "failed" ? "danger" : "warning"}>
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {payment.provider === "demo" ? "Demo payment" : "Razorpay"}
                      {payment.is_demo ? " · simulated" : ""} · {formatDateTime(payment.created_at)}
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

          <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-3 text-[0.68rem] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            This page only loads the booking because it belongs to your signed-in account. A
            different account cannot open it by changing the URL.
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            All dates and times are shown in India Standard Time.
          </div>
        </div>
      </div>
    </div>
  );
}
