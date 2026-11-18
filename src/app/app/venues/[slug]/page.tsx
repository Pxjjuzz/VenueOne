import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Info,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppBookingBar } from "@/components/mobile/app-booking-sheet";
import { AppPhotoPager } from "@/components/mobile/app-photo-pager";
import { AppShareButton } from "@/components/mobile/app-share-button";
import { getPublicVenueBySlug } from "@/lib/venues/queries";
import { loadMonthAvailability } from "@/lib/booking/availability";
import { getPlatformSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth/session";
import { photoPublicUrl } from "@/lib/storage";
import { currentIstMonth, formatIstDate, isoMonthKey, todayIstDateKey, weekdayOf } from "@/lib/time";
import { formatMoney, formatNumber } from "@/lib/format";
import { describePolicy } from "@/lib/policies";
import { parseVenueAttributes } from "@/lib/venue-catalog";
import type { PricingSlot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getPublicVenueBySlug(slug);
  if (!bundle) return { title: "Venue not found" };
  return {
    title: bundle.venue.name,
    description: bundle.venue.description.slice(0, 180),
  };
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_SHORT: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export default async function AppVenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const bundle = await getPublicVenueBySlug(slug);

  if (!bundle) {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-secondary text-muted">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-foreground">
          This space is not listed
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          It may have been unpublished. Other halls and grounds are still live.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  const { venue, photos, pricing, hours, amenities, ownerBusinessName, ownerName } = bundle;
  const platformManaged = !venue.owner_id;
  const [settings, user] = await Promise.all([getPlatformSettings(), getSessionUser()]);

  const initialDate =
    typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
      ? query.date
      : undefined;
  const monthParam =
    typeof query.month === "string" && isoMonthKey(query.month)
      ? query.month
      : initialDate
        ? initialDate.slice(0, 7)
        : currentIstMonth();
  const availability = await loadMonthAvailability(venue.id, monthParam, venue.category);
  const attributes = parseVenueAttributes(venue.category, venue.attributes);

  const priceMap = new Map(pricing.map((row) => [row.slot, row.amount_paise]));
  const fromPrice = priceMap.get(venue.category === "hall" ? "half_day" : "hour") ?? null;
  const cityLine = [venue.city, venue.state].filter(Boolean).join(", ");
  const mapQuery = [venue.name, venue.address_line, venue.city, venue.state, venue.pincode]
    .filter(Boolean)
    .join(", ");
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  const galleryPhotos = photos.map((photo) => ({
    id: photo.id,
    url: photoPublicUrl(photo.storage_path),
    alt: photo.alt_text || `${venue.name}, ${venue.city}`,
  }));

  const initialSlotType = typeof query.slotType === "string" ? query.slotType : undefined;
  const initialStartTime = typeof query.startTime === "string" ? query.startTime : undefined;
  const initialHours = typeof query.hours === "string" ? Number(query.hours) : undefined;

  const stats = [
    venue.capacity != null
      ? { label: "Capacity", value: `${formatNumber(venue.capacity)} guests` }
      : null,
    venue.length_m != null && venue.width_m != null
      ? { label: "Size", value: `${venue.length_m} × ${venue.width_m} m` }
      : null,
    attributes.kind === "hall" && attributes.indoorOutdoor
      ? { label: "Setting", value: attributes.indoorOutdoor }
      : attributes.kind === "ground" && attributes.groundType
        ? { label: "Ground", value: attributes.groundType }
        : null,
    {
      label: "Booking",
      value: venue.booking_policy === "instant" ? "Instant" : "On request",
    },
  ].filter((item): item is { label: string; value: string } => item !== null);

  const extras = (
    attributes.kind === "hall"
      ? [
          attributes.stage ? "Stage" : null,
          attributes.kitchen ? "Kitchen" : null,
          attributes.parking ? "Parking" : null,
        ]
      : [
          attributes.lighting ? "Floodlights" : null,
          attributes.washrooms ? "Washrooms" : null,
          attributes.changingRooms ? "Changing rooms" : null,
          attributes.parking ? "Parking" : null,
        ]
  ).filter((value): value is string => Boolean(value));
  const allFacilities = [...new Set([...amenities, ...extras])];
  const policyLines = describePolicy(settings.cancellationPolicy);
  const priceRows: Array<{ label: string; note: string; slot: PricingSlot }> =
    venue.category === "hall"
      ? [
          { label: "Half day", note: "Morning or afternoon", slot: "half_day" },
          { label: "Full day", note: "Both periods", slot: "full_day" },
        ]
      : [{ label: "Per hour", note: "Minimum one hour", slot: "hour" }];

  const todayWeekday = weekdayOf(todayIstDateKey());
  const todayHours = hours.find((row) => row.weekday === todayWeekday);
  const todayLabel = !todayHours || todayHours.is_closed
    ? "Closed today"
    : `Open today · ${todayHours.opens_at} – ${todayHours.closes_at}`;

  return (
    <div className="pb-32">
      <section className="relative">
        <AppPhotoPager
          photos={galleryPhotos}
          venueName={venue.name}
          category={venue.category}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <Link
            href="/app"
            aria-label="Back to Explore"
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/85 text-foreground shadow-[var(--shadow-sm)] backdrop-blur transition-transform active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <AppShareButton title={venue.name} />
        </div>
      </section>

      <div className="relative z-10 -mt-7 rounded-t-[28px] bg-background px-5 pb-6 pt-6">
        <p className="text-[0.72rem] font-semibold text-primary">
          {venue.category === "hall" ? "Community hall" : "Community ground"}
        </p>
        <h1 className="mt-1.5 text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.04em] text-foreground">
          {venue.name}
        </h1>
        <div className="mt-2 flex items-start justify-between gap-3">
          <p className="flex min-w-0 items-start gap-1.5 text-[0.86rem] leading-relaxed text-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              {venue.address_line}
              {cityLine ? `, ${cityLine}` : ""}
            </span>
          </p>
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer noopener"
            className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-[0.72rem] font-semibold text-primary shadow-[var(--shadow-sm)]"
          >
            Map
          </a>
        </div>

        <div className="mt-5 flex divide-x divide-border overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-[var(--shadow-sm)]">
          {stats.slice(0, 3).map((stat) => (
            <div key={stat.label} className="min-w-0 flex-1 px-2 py-3 text-center">
              <p className="text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-muted">
                {stat.label}
              </p>
              <p className="mt-1 truncate text-[0.8rem] font-semibold text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {venue.description ? (
          <section className="mt-7" aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-[0.95rem] font-semibold text-foreground">
              About this space
            </h2>
            <div className="mt-2 space-y-3 text-[0.9rem] leading-[1.7] text-muted-strong">
              {venue.description
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
          </section>
        ) : null}

        <section className="mt-7" aria-labelledby="facilities-heading">
          <h2 id="facilities-heading" className="text-[0.95rem] font-semibold text-foreground">
            Facilities
          </h2>
          {allFacilities.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {allFacilities.map((facility) => (
                <li
                  key={facility}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-[0.78rem] font-medium text-foreground-soft shadow-[var(--shadow-sm)]"
                >
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  {facility}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[0.84rem] leading-relaxed text-muted">
              Facilities are not listed yet. Ask the venue when you book.
            </p>
          )}
        </section>

        <section className="mt-7" aria-labelledby="pricing-heading">
          <h2 id="pricing-heading" className="text-[0.95rem] font-semibold text-foreground">
            Pricing
          </h2>
          <div className="mt-2 overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-[var(--shadow-sm)]">
            {priceRows.map((row) => (
              <div
                key={row.slot}
                className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <div>
                  <p className="text-[0.86rem] font-medium text-foreground">{row.label}</p>
                  <p className="text-[0.7rem] text-muted">{row.note}</p>
                </div>
                <p className="shrink-0 text-[0.92rem] font-semibold text-foreground tabular">
                  {priceMap.get(row.slot) == null ? (
                    <span className="text-[0.72rem] font-medium text-warning">Pending</span>
                  ) : (
                    formatMoney(priceMap.get(row.slot))
                  )}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.68rem] leading-relaxed text-muted">
            Prices are set by the venue and approved by VenueOne. Any platform fee or tax
            is added to the total before payment.
          </p>
        </section>

        <section className="mt-7" aria-labelledby="hours-heading">
          <h2 id="hours-heading" className="text-[0.95rem] font-semibold text-foreground">
            Opening hours
          </h2>
          <details className="group mt-2 overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-[var(--shadow-sm)]">
            <summary className="flex list-none items-center gap-3 px-4 py-3.5 marker:content-none">
              <Clock3 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-[0.84rem] font-medium text-foreground">
                {todayLabel}
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-border">
              {hours.length === 0 ? (
                <p className="px-4 py-3 text-[0.84rem] text-muted">
                  Opening hours have not been published yet.
                </p>
              ) : (
                WEEKDAY_ORDER.map((weekday) => {
                  const row = hours.find((item) => item.weekday === weekday);
                  const isToday = weekday === todayWeekday;
                  return (
                    <div
                      key={weekday}
                      className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 text-[0.82rem] last:border-0"
                    >
                      <span className={isToday ? "font-semibold text-foreground" : "text-muted-strong"}>
                        {WEEKDAY_SHORT[weekday]}
                        {isToday ? " · today" : ""}
                      </span>
                      <span className="text-muted tabular">
                        {!row || row.is_closed
                          ? "Closed"
                          : `${row.opens_at} – ${row.closes_at}`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </details>
          <p className="mt-2 text-[0.68rem] text-muted">All times are India Standard Time.</p>
        </section>

        <section className="mt-7" aria-labelledby="policies-heading">
          <h2 id="policies-heading" className="text-[0.95rem] font-semibold text-foreground">
            Booking &amp; cancellation
          </h2>
          <details className="group mt-2 overflow-hidden rounded-[var(--radius-md)] bg-surface shadow-[var(--shadow-sm)]">
            <summary className="flex list-none items-center gap-3 px-4 py-3.5 marker:content-none">
              <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-[0.84rem] font-medium text-foreground">
                {venue.booking_policy === "instant"
                  ? `Instant booking · ${venue.payment_window_minutes} minute payment window`
                  : "Owner approval before payment"}
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-border px-4 py-3">
              <p className="text-[0.8rem] leading-relaxed text-muted-strong">
                {venue.booking_policy === "instant"
                  ? `The slot is held for ${venue.payment_window_minutes} minutes while you complete payment. Unpaid holds expire automatically.`
                  : "The venue reviews each request first. If approved, you receive a payment window before the slot is confirmed."}
              </p>
              <p className="mt-3 text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Cancellation &amp; refunds
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {policyLines.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-1.5 text-[0.76rem] leading-relaxed text-muted"
                  >
                    <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
              <Link
                href="/refund-policy"
                className="mt-2 inline-block text-[0.76rem] font-semibold text-primary underline underline-offset-4"
              >
                Read the full policy
              </Link>
            </div>
          </details>
        </section>

        <div className="mt-6 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-surface px-4 py-3.5 shadow-[var(--shadow-sm)]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[0.74rem] leading-relaxed text-muted">
            {platformManaged
              ? "Published and checked by the VenueOne team."
              : `Managed by ${ownerBusinessName || ownerName || "a verified venue owner"}.`}{" "}
            Photographs and details are reviewed before publishing.
          </p>
        </div>

        {photos.length === 0 ? (
          <p className="mt-3 flex items-start gap-2 text-[0.72rem] leading-relaxed text-muted">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            The venue has not uploaded photographs yet.
          </p>
        ) : null}

        <p className="mt-4 text-center text-[0.68rem] text-muted">
          Updated{" "}
          {formatIstDate(venue.updated_at, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      <AppBookingBar
        venueId={venue.id}
        venueSlug={venue.slug}
        venueName={venue.name}
        category={venue.category}
        capacity={venue.capacity}
        bookingPolicy={venue.booking_policy}
        paymentWindowMinutes={venue.payment_window_minutes}
        initialMonth={availability}
        initialDate={initialDate}
        initialSlotType={initialSlotType}
        initialStartTime={initialStartTime}
        initialHours={initialHours}
        signedIn={Boolean(user)}
        fromPrice={fromPrice}
      />
    </div>
  );
}
