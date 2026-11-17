import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  Info,
  MapPin,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BookingWidget } from "@/components/booking-widget";
import { VenueGallery } from "@/components/venue-gallery";
import { Badge } from "@/components/ui/badge";
import { getPublicVenueBySlug } from "@/lib/venues/queries";
import { getPublishedVenueModel } from "@/lib/models/queries";
import { loadMonthAvailability } from "@/lib/booking/availability";
import { getPlatformSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth/session";
import { photoPublicUrl } from "@/lib/storage";
import { currentIstMonth, isoMonthKey } from "@/lib/time";
import { formatMoney } from "@/lib/format";
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
    alternates: { canonical: `/venues/${bundle.venue.slug}` },
  };
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5">
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-[0.82rem] font-medium leading-snug text-foreground">
        {value}
      </p>
    </div>
  );
}

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
        <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
          This space is not listed
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          It may have been unpublished. Other halls and grounds are still live.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  const { venue, photos, pricing, hours, amenities, ownerBusinessName, ownerName } = bundle;
  const platformManaged = !venue.owner_id;
  const [settings, user, venueModel] = await Promise.all([
    getPlatformSettings(),
    getSessionUser(),
    getPublishedVenueModel(venue.id),
  ]);

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
  const fromPrice = priceMap.get(venue.category === "hall" ? "half_day" : "hour");
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

  const specs: Array<{ label: string; value: string }> = [
    venue.capacity != null
      ? { label: "Capacity", value: `Up to ${venue.capacity} guests` }
      : null,
    venue.length_m != null && venue.width_m != null
      ? { label: "Dimensions", value: `${venue.length_m} × ${venue.width_m} m` }
      : null,
    attributes.kind === "hall" && attributes.seatingCapacity != null
      ? { label: "Seating", value: `${attributes.seatingCapacity} seats` }
      : null,
    attributes.kind === "hall"
      ? { label: "Setting", value: attributes.indoorOutdoor }
      : null,
    attributes.kind === "hall" && attributes.rooms != null
      ? { label: "Rooms", value: `${attributes.rooms}` }
      : null,
    attributes.kind === "ground" && attributes.groundType
      ? { label: "Ground type", value: attributes.groundType }
      : null,
    attributes.kind === "ground" && attributes.surfaceType
      ? { label: "Surface", value: attributes.surfaceType }
      : null,
    attributes.kind === "ground" && attributes.sports.length
      ? { label: "Sports", value: attributes.sports.join(", ") }
      : null,
    {
      label: "Booking",
      value: venue.booking_policy === "instant" ? "Instant confirmation" : "Owner approval",
    },
  ].filter((item): item is { label: string; value: string } => item !== null);

  const extras =
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
        ];
  const allFacilities = [...new Set([...amenities, ...(extras as string[])])];
  const policyLines = describePolicy(settings.cancellationPolicy);
  const priceRows: Array<{ label: string; note: string; slot: PricingSlot }> =
    venue.category === "hall"
      ? [
          { label: "Half day", note: "Morning or afternoon period", slot: "half_day" },
          { label: "Full day", note: "Both half-day periods", slot: "full_day" },
        ]
      : [{ label: "Per hour", note: "Minimum one hour", slot: "hour" }];

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur">
        <Link
          href="/app"
          aria-label="Back to Explore"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground-soft hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {venue.name}
        </p>
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-foreground-soft"
        >
          Maps
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </header>

      <div className="px-4 pt-4">
        <VenueGallery
          photos={galleryPhotos}
          category={venue.category}
          venueName={venue.name}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">
            {venue.category === "hall" ? "Community hall" : "Community ground"}
          </Badge>
          <Badge tone="success" icon={<ShieldCheck className="h-3 w-3" aria-hidden="true" />}>
            Approved venue
          </Badge>
        </div>

        <h1 className="mt-3 font-display text-[1.7rem] font-semibold leading-[1.12] tracking-[-0.04em] text-foreground">
          {venue.name}
        </h1>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          {venue.address_line}
          {cityLine ? `, ${cityLine}` : ""}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted">
              {venue.category === "hall" ? "Starting from" : "Hourly rate"}
            </p>
            <p className="mt-0.5 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground tabular">
              {fromPrice != null ? formatMoney(fromPrice) : "—"}
            </p>
          </div>
          <a
            href="#book"
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            Check dates
          </a>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          {specs.map((spec) => (
            <Spec key={spec.label} label={spec.label} value={spec.value} />
          ))}
        </div>

        {venueModel ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-[0.72rem] leading-relaxed text-muted">
              A 3D walkthrough is published for this space. It opens in a desktop
              browser on the{" "}
              <Link
                href={`/venues/${venue.slug}`}
                className="font-semibold text-primary underline underline-offset-2"
              >
                full listing
              </Link>
              .
            </p>
          </div>
        ) : null}

        <section id="book" aria-labelledby="book-heading" className="mt-6 scroll-mt-20">
          <h2 id="book-heading" className="font-display text-lg font-semibold tracking-[-0.03em]">
            Check dates and book
          </h2>
          <div className="mt-3">
            <BookingWidget
              venueId={venue.id}
              venueSlug={venue.slug}
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
              app
            />
          </div>
        </section>

        <section aria-labelledby="about-heading" className="mt-8">
          <h2 id="about-heading" className="font-display text-lg font-semibold tracking-[-0.03em]">
            About this space
          </h2>
          <div className="mt-2 space-y-3 text-[0.9rem] leading-[1.75] text-muted-strong">
            {venue.description
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
        </section>

        <section aria-labelledby="facilities-heading" className="mt-8">
          <h2 id="facilities-heading" className="font-display text-lg font-semibold tracking-[-0.03em]">
            Facilities
          </h2>
          {allFacilities.length > 0 ? (
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {allFacilities.map((facility) => (
                <li
                  key={facility}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[0.8rem] text-foreground-soft"
                >
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  {facility}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The venue has not listed individual facilities yet. Ask about specific
              requirements when you book.
            </p>
          )}
        </section>

        <section aria-labelledby="pricing-heading" className="mt-8">
          <h2 id="pricing-heading" className="font-display text-lg font-semibold tracking-[-0.03em]">
            Pricing
          </h2>
          <div className="mt-2 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
            {priceRows.map((row) => (
              <div
                key={row.slot}
                className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{row.note}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-foreground tabular">
                  {priceMap.get(row.slot) == null ? (
                    <span className="text-xs font-normal text-warning">Pending approval</span>
                  ) : (
                    formatMoney(priceMap.get(row.slot))
                  )}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">
            Prices are set by the venue and approved by the platform. The booking
            summary adds any configured platform fee or tax before payment. No other
            charges are invented.
          </p>
        </section>

        <section aria-labelledby="hours-heading" className="mt-8">
          <h2 id="hours-heading" className="font-display text-lg font-semibold tracking-[-0.03em]">
            Operating hours
          </h2>
          <div className="mt-2 overflow-hidden rounded-[var(--radius-md)] border border-border">
            {hours.length === 0 ? (
              <p className="bg-surface px-4 py-3 text-sm text-muted">
                Opening hours have not been published yet.
              </p>
            ) : (
              WEEKDAY_ORDER.map((weekday) => {
                const row = hours.find((item) => item.weekday === weekday);
                return (
                  <div
                    key={weekday}
                    className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-2.5 text-sm last:border-0"
                  >
                    <span className="text-foreground-soft">{WEEKDAY_LABELS[weekday]}</span>
                    <span className="text-muted tabular">
                      {!row || row.is_closed ? "Closed" : `${row.opens_at} – ${row.closes_at}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            All times are India Standard Time (IST).
          </p>
        </section>

        <section aria-labelledby="policies-heading" className="mt-8">
          <h2 id="policies-heading" className="font-display text-lg font-semibold tracking-[-0.03em]">
            Booking &amp; cancellation
          </h2>
          <div className="mt-2 rounded-[var(--radius-md)] border border-border bg-surface p-4">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted">
              Booking policy
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground-soft">
              {venue.booking_policy === "instant"
                ? `Instant booking. The slot is held for ${venue.payment_window_minutes} minutes while you complete payment. Unpaid holds expire automatically.`
                : "Owner approval. The venue reviews each request first. If approved, you receive a payment window before the slot is confirmed."}
            </p>
            <p className="mt-4 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted">
              Cancellation &amp; refunds
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {policyLines.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-1.5 text-xs leading-relaxed text-muted"
                >
                  <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/refund-policy"
              className="mt-2 inline-block text-xs font-semibold text-primary underline underline-offset-4"
            >
              Read the full policy
            </Link>
          </div>
        </section>

        <section aria-labelledby="managed-heading" className="mt-8">
          <h2 id="managed-heading" className="font-display text-lg font-semibold tracking-[-0.03em]">
            {platformManaged ? "Published by" : "Managed by"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {platformManaged
              ? "The VenueOne team"
              : ownerBusinessName || ownerName || "A verified venue owner"}{" "}
            · Published after platform review.
          </p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            {platformManaged
              ? "Approved listing. Photographs and details are published by the VenueOne team."
              : "Approved listing. Photographs and details are supplied by the venue."}
          </p>
        </section>

        <div className="mt-8 flex items-center justify-center gap-2 text-[0.68rem] text-muted">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Availability is checked live for each date you pick.
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/app"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface text-sm font-medium text-foreground-soft"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Explore
          </Link>
          <Link
            href={`/venues/${venue.slug}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] text-xs font-medium text-muted underline underline-offset-4"
          >
            <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
            Open the full website listing
          </Link>
        </div>
      </div>
    </div>
  );
}
