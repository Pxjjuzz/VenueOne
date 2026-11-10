import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  bookingStatusTone,
  type BookingWithVenue,
} from "@/lib/types";
import { photoPublicUrl } from "@/lib/storage";
import { cn } from "@/lib/cn";

function paymentTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "processing") return "warning" as const;
  if (status === "refunded" || status === "partially_refunded") return "info" as const;
  return "neutral" as const;
}

export function BookingSummaryCard({
  booking,
  compact = false,
}: {
  booking: BookingWithVenue;
  compact?: boolean;
}) {
  const photo = booking.photo_path ? photoPublicUrl(booking.photo_path) : null;

  return (
    <Link
      href={`/dashboard/bookings/${booking.id}`}
      className="group block rounded-[var(--radius-md)] border border-border bg-surface p-4 transition-shadow hover:shadow-[var(--shadow-md)] sm:p-5"
    >
      <div className="flex items-start gap-4">
        <div className="relative hidden h-20 w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface-secondary sm:block">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="grid h-full w-full place-items-center text-[0.6rem] uppercase tracking-[0.1em] text-muted">
              {booking.venue_category === "hall" ? "Hall" : "Ground"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
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

          <h2 className="mt-2 truncate font-display text-base font-semibold tracking-[-0.02em] text-foreground group-hover:text-primary">
            {booking.venue_name}
          </h2>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDateTime(booking.starts_at)}
            </span>
            {!compact ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {booking.venue_city}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {booking.reference}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-foreground tabular">{formatMoney(booking.total_paise)}</p>
          <span className="mt-2 inline-flex items-center gap-0.5 text-[0.68rem] font-medium text-muted group-hover:text-primary">
            View <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function BookingMiniRow({
  booking,
  className,
}: {
  booking: BookingWithVenue;
  className?: string;
}) {
  return (
    <Link
      href={`/dashboard/bookings/${booking.id}`}
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border/70 py-3 last:border-0",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{booking.venue_name}</p>
        <p className="mt-0.5 text-xs text-muted">
          {formatDateTime(booking.starts_at)} · {booking.reference}
        </p>
      </div>
      <StatusBadge
        status={booking.status}
        label={BOOKING_STATUS_LABELS[booking.status]}
        tone={bookingStatusTone(booking.status)}
      />
    </Link>
  );
}
