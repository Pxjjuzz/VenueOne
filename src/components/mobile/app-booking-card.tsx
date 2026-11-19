import Link from "next/link";
import { Building2, ChevronRight, CreditCard, Trees } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { formatIstDate, formatIstTime } from "@/lib/time";
import { photoPublicUrl } from "@/lib/storage";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  bookingStatusTone,
  type BookingWithVenue,
} from "@/lib/types";

// One tappable row per booking: photograph, status, venue, date and total. The
// thumbnail stays square so long venue names still fit on a 360px screen.
export function AppBookingCard({ booking }: { booking: BookingWithVenue }) {
  const photo = booking.photo_path ? photoPublicUrl(booking.photo_path) : null;
  const isHall = booking.venue_category === "hall";
  const needsPayment = booking.status === "awaiting_payment";

  return (
    <Link
      href={`/app/bookings/${booking.id}`}
      className="block overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-sm)] transition-transform duration-150 ease-out active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
    >
      <div className="flex gap-3.5 p-3.5">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-secondary">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-primary/60" aria-hidden="true">
              {isHall ? <Building2 className="h-6 w-6" /> : <Trees className="h-6 w-6" />}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <StatusBadge
              status={booking.status}
              label={BOOKING_STATUS_LABELS[booking.status]}
              tone={bookingStatusTone(booking.status)}
            />
            <p className="shrink-0 text-[0.95rem] font-semibold leading-6 text-foreground tabular">
              {formatMoney(booking.total_paise)}
            </p>
          </div>

          <h2 className="mt-1.5 truncate text-[0.98rem] font-semibold leading-tight tracking-[-0.01em] text-foreground">
            {booking.venue_name}
          </h2>

          <p className="mt-1 text-[0.78rem] text-muted">
            {formatIstDate(booking.starts_at, { weekday: "short", day: "numeric", month: "short" })}
            {" · "}
            {formatIstTime(booking.starts_at)} – {formatIstTime(booking.ends_at)}
          </p>

          <div className="mt-1 flex items-center gap-1.5 text-[0.72rem] text-muted">
            <span className="truncate">{booking.reference}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{booking.venue_city}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/70 px-3.5 py-2.5">
        <span className="truncate text-[0.72rem] font-medium text-muted">
          {needsPayment ? "Payment due" : PAYMENT_STATUS_LABELS[booking.payment_status]}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[0.72rem] font-semibold text-primary">
          {needsPayment ? (
            <>
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              Pay now
            </>
          ) : (
            <>
              Open booking
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
