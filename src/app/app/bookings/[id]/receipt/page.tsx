import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, LogIn, ReceiptText } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getBookingForCustomer, listBookingPayments, listRefundsForBooking } from "@/lib/booking/queries";
import { AppPanel, AppRow } from "@/components/mobile/app-panel";
import { AppScreenHeader } from "@/components/mobile/app-screen-header";
import { AppPrintButton } from "@/components/mobile/app-print-button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatMoney, titleCase } from "@/lib/format";
import { formatIstDateLong, formatIstTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false, follow: false },
};

const METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
};

function methodLabel(method: string | null, provider: string) {
  if (method) return METHOD_LABELS[method.toLowerCase()] ?? titleCase(method);
  return provider === "demo" ? "Demo payment" : "Online payment";
}

export default async function AppReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex min-h-[75dvh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted shadow-[var(--shadow-sm)]">
          <LogIn className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[1.35rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
          Sign in to open this receipt
        </h1>
        <p className="mt-2 max-w-xs text-[0.85rem] leading-relaxed text-muted">
          Receipts show payment records, so they are only shown to the account that
          made the booking.
        </p>
        <Link
          href={`/auth/sign-in?next=${encodeURIComponent(`/app/bookings/${id}/receipt`)}`}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
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
      <div className="flex min-h-[75dvh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted shadow-[var(--shadow-sm)]">
          <ReceiptText className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[1.35rem] font-semibold leading-tight tracking-[-0.03em] text-foreground">
          Receipt not available
        </h1>
        <p className="mt-2 max-w-xs text-[0.85rem] leading-relaxed text-muted">
          This booking does not belong to your account, or it no longer exists.
        </p>
        <Link
          href="/app/bookings"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Back to my bookings
        </Link>
      </div>
    );
  }

  const [payments, refunds] = await Promise.all([
    listBookingPayments(booking.id),
    listRefundsForBooking(booking.id),
  ]);

  const captured = payments.filter((payment) => payment.status === "captured");
  const payment = captured[0] ?? null;
  const refundedPaise = refunds
    .filter((refund) => refund.status === "processed")
    .reduce((sum, refund) => sum + refund.amount_paise, 0);
  const snapshot = booking.pricing_snapshot as Record<string, unknown>;
  const snapshotLabel =
    typeof snapshot.slotLabel === "string"
      ? snapshot.slotLabel
      : typeof snapshot.label === "string"
        ? snapshot.label
        : null;

  return (
    <div className="app-print-root pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="app-no-print">
        <AppScreenHeader
          backHref={`/app/bookings/${booking.id}`}
          backLabel="Back to booking"
          title="Receipt"
          hint={booking.reference}
        />
      </div>

      <div className="px-5 pt-2">
        {payment ? (
          <>
            <article className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-sm)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
                    VenueOne
                  </p>
                  <h1 className="mt-1 text-[1.3rem] font-semibold leading-tight tracking-[-0.02em] text-foreground">
                    Payment receipt
                  </h1>
                  <p className="mt-0.5 text-[0.75rem] text-muted">{booking.reference}</p>
                </div>
                <Badge tone="success" icon={<CheckCircle2 className="h-3 w-3" aria-hidden="true" />}>
                  Paid
                </Badge>
              </div>

              <dl className="mt-5 border-t border-border pt-3">
                <AppRow label="Venue" value={booking.venue_name} />
                <AppRow
                  label="Address"
                  value={`${booking.venue_address_line}, ${booking.venue_city}, ${booking.venue_state}`}
                />
                <AppRow label="Date" value={formatIstDateLong(booking.starts_at)} />
                <AppRow
                  label="Time"
                  value={`${formatIstTime(booking.starts_at)} – ${formatIstTime(booking.ends_at)}`}
                />
                {snapshotLabel ? <AppRow label="Slot" value={snapshotLabel} /> : null}
                {booking.guest_count ? (
                  <AppRow label="Guests" value={String(booking.guest_count)} />
                ) : null}
                <AppRow label="Booked by" value={booking.customer_name ?? booking.customer_email} />
              </dl>

              <div className="mt-4 rounded-[var(--radius-md)] bg-surface-secondary/60 p-3.5">
                <dl>
                  <AppRow label="Booking subtotal" value={formatMoney(booking.subtotal_paise)} />
                  <AppRow label="Platform fee" value={formatMoney(booking.fee_paise)} />
                  <AppRow label="Tax" value={formatMoney(booking.tax_paise)} />
                  <AppRow
                    label="Total"
                    value={
                      <span className="text-[0.9rem] font-semibold text-foreground">
                        {formatMoney(booking.total_paise)}
                      </span>
                    }
                  />
                </dl>
              </div>

              <dl className="mt-4 border-t border-border pt-3">
                <AppRow label="Payment method" value={methodLabel(payment.method, payment.provider)} />
                <AppRow label="Provider" value={payment.provider === "demo" ? "Demo payment" : "Razorpay"} />
                <AppRow label="Amount paid" value={formatMoney(payment.amount_paise)} />
                <AppRow
                  label="Paid on"
                  value={formatDateTime(payment.captured_at ?? payment.created_at)}
                />
                {refundedPaise > 0 ? (
                  <AppRow label="Refunded" value={`- ${formatMoney(refundedPaise)}`} />
                ) : null}
                {payment.provider_payment_id ? (
                  <AppRow label="Payment ID" value={payment.provider_payment_id} />
                ) : null}
              </dl>

              <p className="mt-4 text-[0.68rem] leading-relaxed text-muted">
                Generated from the payment records stored on the VenueOne server. Keep
                this receipt for your records. Refunds are listed only after the payment
                provider confirms them.
              </p>
            </article>

            <div className="app-no-print mt-4 space-y-2.5">
              <AppPrintButton />
              <Link
                href={`/app/bookings/${booking.id}`}
                className="flex h-11 w-full items-center justify-center rounded-full bg-surface text-[0.82rem] font-semibold text-foreground-soft shadow-[var(--shadow-sm)]"
              >
                Back to booking
              </Link>
            </div>

            {captured.length > 1 ? (
              <div className="app-no-print">
                <AppPanel title="Other payments" hint="Reviewed by the platform team">
                  <ul className="space-y-2">
                    {captured.slice(1).map((extra) => (
                      <li key={extra.id} className="flex items-center justify-between gap-3">
                        <span className="text-[0.78rem] text-muted">
                          {formatDateTime(extra.captured_at ?? extra.created_at)}
                        </span>
                        <span className="text-[0.78rem] font-medium text-foreground tabular">
                          {formatMoney(extra.amount_paise)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </AppPanel>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-10 flex flex-col items-center px-2 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-muted shadow-[var(--shadow-sm)]">
              <ReceiptText className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[1.05rem] font-semibold text-foreground">
              No payment recorded yet
            </p>
            <p className="mt-1.5 max-w-xs text-[0.85rem] leading-relaxed text-muted">
              A receipt appears here once the payment provider confirms a payment for
              this booking.
            </p>
            <Link
              href={`/app/bookings/${booking.id}`}
              className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-[0.82rem] font-semibold text-white"
            >
              Back to booking
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
