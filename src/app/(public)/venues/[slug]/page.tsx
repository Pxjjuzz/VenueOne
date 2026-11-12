import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  Star,
  Users,
} from "lucide-react";
import { BookingWidget } from "@/components/booking-widget";
import { VenueGallery } from "@/components/venue-gallery";
import { VenueModelExperience } from "@/components/venue-3d/venue-model-experience";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { getPublicVenueBySlug } from "@/lib/venues/queries";
import { getPublishedVenueModel } from "@/lib/models/queries";
import { modelPublicUrl } from "@/lib/models/storage";
import { loadMonthAvailability } from "@/lib/booking/availability";
import { getPlatformSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth/session";
import { photoPublicUrl } from "@/lib/storage";
import { currentIstMonth, isoMonthKey } from "@/lib/time";
import { formatMoney } from "@/lib/format";
import { describePolicy } from "@/lib/policies";
import { parseVenueAttributes } from "@/lib/venue-catalog";
import { VENUE_MODEL_ACCURACY_LABELS } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getPublicVenueBySlug(slug);
  if (!bundle) return { title: "Venue not found" };
  const venue = bundle.venue;
  return {
    title: venue.name,
    description: venue.description.slice(0, 180),
    alternates: { canonical: `/venues/${venue.slug}` },
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

function DurationPrice({
  label,
  paise,
  note,
}: {
  label: string;
  paise: number | null;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
      </div>
      <p className="shrink-0 text-sm font-semibold text-foreground tabular">
        {paise == null ? <span className="text-xs font-normal text-warning">Pending approval</span> : formatMoney(paise)}
      </p>
    </div>
  );
}

function Spec({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted">
        <span className="text-primary" aria-hidden="true">{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default async function VenueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const bundle = await getPublicVenueBySlug(slug);
  if (!bundle) notFound();

  const { venue, photos, pricing, hours, amenities, ownerBusinessName, ownerName } = bundle;
  const [settings, user] = await Promise.all([getPlatformSettings(), getSessionUser()]);
  const initialDate = typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : undefined;
  const monthParam =
    typeof query.month === "string" && isoMonthKey(query.month)
      ? query.month
      : initialDate
        ? initialDate.slice(0, 7)
        : currentIstMonth();
  const availability = await loadMonthAvailability(venue.id, monthParam, venue.category);
  const attributes = parseVenueAttributes(venue.category, venue.attributes);
  const venueModel = await getPublishedVenueModel(venue.id);

  const priceMap = new Map(pricing.map((row) => [row.slot, row.amount_paise]));
  const cityLine = [venue.city, venue.state, venue.pincode].filter(Boolean).join(", ");
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

  type SpecItem = { icon: React.ReactNode; label: string; value: string };
  const hallSpecific: SpecItem[] =
    attributes.kind === "hall"
      ? ([
          attributes.seatingCapacity != null
            ? { icon: <Users className="h-3.5 w-3.5" />, label: "Seating capacity", value: `${attributes.seatingCapacity} seats` }
            : null,
          { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Indoor / outdoor", value: attributes.indoorOutdoor },
          attributes.rooms != null
            ? { icon: <MapPin className="h-3.5 w-3.5" />, label: "Rooms", value: `${attributes.rooms}` }
            : null,
        ] as Array<SpecItem | null>).filter((item): item is SpecItem => item !== null)
      : [];

  const groundSpecific: SpecItem[] =
    attributes.kind === "ground"
      ? ([
          attributes.groundType
            ? { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Ground type", value: attributes.groundType }
            : null,
          attributes.surfaceType
            ? { icon: <Ruler className="h-3.5 w-3.5" />, label: "Surface", value: attributes.surfaceType }
            : null,
          attributes.sports.length
            ? { icon: <Users className="h-3.5 w-3.5" />, label: "Sports", value: attributes.sports.join(", ") }
            : null,
        ] as Array<SpecItem | null>).filter((item): item is SpecItem => item !== null)
      : [];

  const extras =
    attributes.kind === "hall"
      ? [
          attributes.stage ? "Stage" : null,
          attributes.kitchen ? "Kitchen" : null,
          attributes.parking ? "Parking" : null,
        ].filter(Boolean)
      : [
          attributes.lighting ? "Floodlights" : null,
          attributes.washrooms ? "Washrooms" : null,
          attributes.changingRooms ? "Changing rooms" : null,
          attributes.parking ? "Parking" : null,
        ].filter(Boolean);

  const allFacilities = [...new Set([...amenities, ...(extras as string[])])];
  const policyLines = describePolicy(settings.cancellationPolicy);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EventVenue",
    name: venue.name,
    description: venue.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address_line,
      addressLocality: venue.city,
      addressRegion: venue.state,
      postalCode: venue.pincode,
      addressCountry: "IN",
    },
    ...(venue.latitude != null && venue.longitude != null
      ? { geo: { "@type": "GeoCoordinates", latitude: venue.latitude, longitude: venue.longitude } }
      : {}),
  };

  return (
    <div className="container-page py-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }}
      />

      <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href={venue.category === "hall" ? "/halls" : "/grounds"} className="hover:text-foreground">
          {venue.category === "hall" ? "Community halls" : "Community grounds"}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-foreground-soft">{venue.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0">
          {venueModel?.storage_path ? (
            <VenueModelExperience
              venueName={venue.name}
              modelUrl={modelPublicUrl(venueModel.storage_path)}
              posterUrl={venueModel.preview_path ? modelPublicUrl(venueModel.preview_path) : null}
              accuracyLabel={VENUE_MODEL_ACCURACY_LABELS[venueModel.accuracy]}
            />
          ) : null}

          <div id="venue-gallery">
            <VenueGallery photos={galleryPhotos} category={venue.category} venueName={venue.name} />
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">
                  {venue.category === "hall" ? "Community hall" : "Community ground"}
                </Badge>
                <Badge tone="success" icon={<ShieldCheck className="h-3 w-3" aria-hidden="true" />}>
                  Approved venue
                </Badge>
              </div>
              <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-[2.6rem]">
                {venue.name}
              </h1>
              <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {venue.address_line}
                {cityLine ? `, ${cityLine}` : ""}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                {venue.category === "hall" ? "Starting from" : "Hourly rate"}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground tabular">
                {priceMap.get(venue.category === "hall" ? "half_day" : "hour") != null
                  ? formatMoney(priceMap.get(venue.category === "hall" ? "half_day" : "hour"))
                  : "—"}
              </p>
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4"
              >
                Open in Maps <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {venue.capacity != null ? (
              <Spec icon={<Users className="h-3.5 w-3.5" />} label="Capacity" value={`Up to ${venue.capacity} guests`} />
            ) : null}
            {venue.length_m != null && venue.width_m != null ? (
              <Spec
                icon={<Ruler className="h-3.5 w-3.5" />}
                label="Dimensions"
                value={`${venue.length_m} × ${venue.width_m} m`}
              />
            ) : null}
            {hallSpecific.map((item) => (
              <Spec key={item.label} icon={item.icon} label={item.label} value={item.value} />
            ))}
            {groundSpecific.map((item) => (
              <Spec key={item.label} icon={item.icon} label={item.label} value={item.value} />
            ))}
            <Spec
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Booking"
              value={venue.booking_policy === "instant" ? "Instant confirmation" : "Owner approval"}
            />
          </div>

          <div className="mt-10 space-y-10">
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="font-display text-xl font-semibold tracking-[-0.03em]">
                About this space
              </h2>
              <div className="mt-3 space-y-3 text-[0.9375rem] leading-[1.8] text-muted-strong">
                {venue.description.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section aria-labelledby="facilities-heading">
              <h2 id="facilities-heading" className="font-display text-xl font-semibold tracking-[-0.03em]">
                Facilities
              </h2>
              {allFacilities.length > 0 ? (
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {allFacilities.map((facility) => (
                    <li key={facility} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-sm text-foreground-soft">
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      {facility}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  The venue has not listed individual facilities yet. Ask about specific requirements when you book.
                </p>
              )}
            </section>

            <section aria-labelledby="pricing-heading">
              <h2 id="pricing-heading" className="font-display text-xl font-semibold tracking-[-0.03em]">
                Pricing
              </h2>
              <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-surface px-4">
                {venue.category === "hall" ? (
                  <>
                    <DurationPrice label="Half day" note="Morning or afternoon period" paise={priceMap.get("half_day") ?? null} />
                    <DurationPrice label="Full day" note="Both half-day periods" paise={priceMap.get("full_day") ?? null} />
                  </>
                ) : (
                  <DurationPrice label="Per hour" note="Minimum one hour" paise={priceMap.get("hour") ?? null} />
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Prices are set by the venue and approved by the platform. The booking
                summary adds any configured platform fee or tax before payment. No
                other charges are invented.
              </p>
            </section>

            <section aria-labelledby="hours-heading">
              <h2 id="hours-heading" className="font-display text-xl font-semibold tracking-[-0.03em]">
                Operating hours
              </h2>
              <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-border">
                {WEEKDAY_ORDER.map((weekday) => {
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
                })}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                All times are India Standard Time (IST).
              </p>
            </section>

            <section aria-labelledby="policies-heading">
              <h2 id="policies-heading" className="font-display text-xl font-semibold tracking-[-0.03em]">
                Booking &amp; cancellation
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Booking policy</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-soft">
                    {venue.booking_policy === "instant"
                      ? `Instant booking. The slot is held for ${venue.payment_window_minutes} minutes while you complete payment. Unpaid holds expire automatically.`
                      : "Owner approval. The venue reviews each request first. If approved, you receive a payment window before the slot is confirmed."}
                  </p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Cancellation &amp; refunds</p>
                  <ul className="mt-2 space-y-1.5">
                    {policyLines.map((line) => (
                      <li key={line} className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                        <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <Link href="/refund-policy" className="mt-2 inline-block text-xs font-semibold text-primary underline underline-offset-4">
                    Read the full policy
                  </Link>
                </div>
              </div>
            </section>

            <section aria-labelledby="reviews-heading">
              <h2 id="reviews-heading" className="font-display text-xl font-semibold tracking-[-0.03em]">
                Reviews
              </h2>
              <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-4">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Star className="h-4 w-4 text-muted" aria-hidden="true" />
                  No reviews yet
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Reviews are not seeded or invented. Verified reviews will appear
                  after guests complete bookings and the review feature opens.
                </p>
              </div>
            </section>

            <section aria-labelledby="managed-heading">
              <h2 id="managed-heading" className="font-display text-xl font-semibold tracking-[-0.03em]">
                Managed by
              </h2>
              <p className="mt-2 text-sm text-muted">
                {ownerBusinessName || ownerName || "A verified venue owner"} · Published after
                platform review.
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Approved listing. Photographs and details are supplied by the venue.
              </p>
            </section>
          </div>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]" aria-label="Book this venue">
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
          />
          <div className="mt-3 rounded-[var(--radius-sm)] border border-border bg-surface/60 px-3.5 py-3 text-[0.68rem] leading-relaxed text-muted">
            <p className="flex items-start gap-1.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              Payment is confirmed on the server. A front-end success screen is never
              treated as proof of payment.
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <ButtonLink href={venue.category === "hall" ? "/halls" : "/grounds"} variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to {venue.category === "hall" ? "halls" : "grounds"}
            </ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
