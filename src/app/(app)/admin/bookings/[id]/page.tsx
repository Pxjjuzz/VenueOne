import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Undo2,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import {
  getBookingForAdmin,
  getBookingStatusHistory,
  getCancellationForBooking,
  listBookingPayments,
  listRefundsForBooking,
} from "@/lib/booking/queries";
import { paymentDisplayMode } from "@/lib/payments/service";
import { PageHeader } from "@/components/ui/page-header";
import { InfoRow, Panel } from "@/components/ui/stat-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { AdminSyncPayment } from "@/components/admin/admin-refund-button";
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
  title: "Booking oversight",
  robots: { index: false, follow: false },
};

function paymentTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "processing") return "warning" as const;
  if (status === "refunded" || status === "partially_refunded") return "info" as const;
  return "neutral" as const;
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  await requireAdmin();
  const booking = await getBookingForAdmin(id);
  if (!booking) notFound();

  const [history, payments, cancellation, refunds] = await Promise.all([
    getBookingStatusHistory(booking.id),
    listBookingPayments(booking.id),
    getCancellationForBooking(booking.id),
    listRefundsForBooking(booking.id),
  ]);

  const mode = paymentDisplayMode();
  const snapshot = booking.pricing_snapshot as Record<string, unknown>;
  const slotLabel =
    typeof snapshot.slotLabel === "string"
      ? snapshot.slotLabel
      : typeof snapshot.label === "string"
        ? snapshot.label
        : null;

  const canSync = payments.some((payment) => payment.provider === "razorpay");

  return (
    <div className="space-y-6">
      <Link
        href="/admin/bookings"
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
          <Panel title="Booking details" description="Recorded by the server">
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
              {booking.notes ? <InfoRow label="Notes" value={booking.notes} /> : null}
              <InfoRow label="Requested" value={formatDateTime(booking.created_at)} />
              {booking.hold_expires_at ? (
                <InfoRow label="Hold expires" value={formatDateTime(booking.hold_expires_at)} />
              ) : null}
              {booking.decided_at ? (
                <InfoRow label="Owner decision" value={formatDateTime(booking.decided_at)} />
              ) : null}
              {booking.decision_note ? (
                <InfoRow label="Owner note" value={booking.decision_note} />
              ) : null}
              {booking.cancelled_at ? (
                <InfoRow label="Cancelled" value={formatDateTime(booking.cancelled_at)} />
              ) : null}
            </dl>
          </Panel>

          <Panel title="Price breakdown" description="Stored with the booking snapshot">
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

          <Panel title="Status history" description="Newest last">
            {history.length === 0 ? (
              <p className="text-sm text-muted">No transitions recorded.</p>
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
          <Panel title="Customer" description="Booking account">
            <ul className="space-y-3 text-sm">
              <li className="font-medium text-foreground">
                {booking.customer_name || "No name"}
              </li>
              <li className="flex items-start gap-2.5 text-muted-strong">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <a href={`mailto:${booking.customer_email}`} className="break-all hover:text-foreground">
                  {booking.customer_email}
                </a>
              </li>
              {booking.customer_phone ? (
                <li className="flex items-start gap-2.5 text-muted-strong">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`tel:${booking.customer_phone}`} className="hover:text-foreground">
                    {booking.customer_phone}
                  </a>
                </li>
              ) : null}
              {booking.guest_count ? (
                <li className="flex items-start gap-2.5 text-muted-strong">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {booking.guest_count} guests
                </li>
              ) : null}
            </ul>
            <div className="mt-4 border-t border-border pt-3">
              <ButtonLink
                href={`/dashboard/bookings/${booking.id}`}
                variant="ghost"
                size="sm"
              >
                Customer view
              </ButtonLink>
            </div>
          </Panel>

          <Panel title="Venue" description="Listing involved">
            <ul className="space-y-2.5 text-sm text-muted-strong">
              <li className="font-medium text-foreground">{booking.venue_name}</li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {booking.venue_address_line}, {booking.venue_city}, {booking.venue_state}
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink
                href={`/admin/venues/${booking.venue_id}`}
                variant="secondary"
                size="sm"
              >
                Review venue
              </ButtonLink>
              {booking.venue_slug ? (
                <ButtonLink href={`/venues/${booking.venue_slug}`} variant="ghost" size="sm">
                  Public page
                </ButtonLink>
              ) : null}
            </div>
          </Panel>

          <Panel
            title="Payments"
            description={
              mode.mode === "demo"
                ? "Demo mode: no real money moves"
                : `Razorpay ${mode.testMode ? "test mode" : "live mode"}`
            }
          >
            {payments.length === 0 ? (
              <p className="text-sm text-muted">No payment attempts recorded.</p>
            ) : (
              <ul className="space-y-3">
                {payments.map((payment) => (
                  <li key={payment.id} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
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
                      {payment.provider === "demo" ? "Demo" : "Razorpay"}
                      {payment.is_demo ? " · simulated" : ""} · {formatDateTime(payment.created_at)}
                    </p>
                    {payment.provider_order_id ? (
                      <p className="mt-0.5 break-all text-[0.62rem] text-muted">
                        Order: {payment.provider_order_id}
                      </p>
                    ) : null}
                    {payment.provider_payment_id ? (
                      <p className="break-all text-[0.62rem] text-muted">
                        Payment: {payment.provider_payment_id}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {canSync ? (
              <div className="mt-4 border-t border-border pt-3">
                <AdminSyncPayment bookingId={booking.id} />
                <p className="mt-2 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-muted">
                  <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Sync checks Razorpay directly. Confirmation still requires a captured
                  provider status; the browser is never trusted.
                </p>
              </div>
            ) : null}
          </Panel>

          {cancellation ? (
            <Panel
              title="Cancellation"
              description={`Requested ${formatDateTime(cancellation.created_at)}`}
              actions={<Badge tone={cancellation.status === "approved" ? "success" : cancellation.status === "rejected" ? "danger" : "warning"}>{CANCELLATION_STATUS_LABELS[cancellation.status]}</Badge>}
            >
              <p className="text-sm leading-relaxed text-muted-strong">{cancellation.reason}</p>
              <dl className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted">
                <div className="flex justify-between gap-3">
                  <dt>Refund eligibility</dt>
                  <dd className="text-foreground">
                    {cancellation.refund_eligible ? "Eligible" : "Not eligible"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Calculated refund</dt>
                  <dd className="font-medium text-foreground tabular">
                    {formatMoney(cancellation.refund_amount_paise)} ({cancellation.refund_percent}%)
                  </dd>
                </div>
                {cancellation.admin_note ? (
                  <div className="flex justify-between gap-3">
                    <dt>Admin note</dt>
                    <dd className="text-right text-foreground">{cancellation.admin_note}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4">
                <ButtonLink href="/admin/cancellations" variant="secondary" size="sm">
                  Open cancellation queue
                </ButtonLink>
              </div>
            </Panel>
          ) : null}

          {refunds.length > 0 ? (
            <Panel title="Refunds" description="Provider-confirmed outcomes only">
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
                      {refund.is_demo ? " · demo" : ""}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <ButtonLink href="/admin/refunds" variant="secondary" size="sm">
                  <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Open refund queue
                </ButtonLink>
              </div>
            </Panel>
          ) : null}

          <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-3 text-[0.68rem] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            This view is read-only. Cancellations, refunds and payment reconciliation each
            have dedicated, audited actions.
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
