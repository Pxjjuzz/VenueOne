import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarX2,
  Clock3,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import { getVenueForOwner, listVenueBlocks } from "@/lib/venues/queries";
import { venueSubmissionIssues } from "@/lib/validation";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { VenueForm, type VenueFormDefaults } from "@/components/owner/venue-form";
import { VenuePhotoManager, type OwnerPhoto } from "@/components/owner/venue-photo-manager";
import { VenueBlocksManager, type OwnerBlock } from "@/components/owner/venue-blocks-manager";
import { VenuePublishControls } from "@/components/owner/venue-publish-controls";
import { formatDateTime, formatMoney } from "@/lib/format";
import { todayIstDateKey } from "@/lib/time";
import { photoPublicUrl, MAX_PHOTOS_PER_VENUE } from "@/lib/storage";
import {
  VENUE_STATUS_LABELS,
  venueStatusTone,
  type VenueStatus,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Edit venue",
  robots: { index: false, follow: false },
};

const SLOT_LABELS: Record<string, string> = {
  half_day: "Half day",
  full_day: "Full day",
  hour: "Hourly",
};

function attrString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function attrNumberString(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function attrBoolean(value: unknown): boolean {
  return value === true;
}

function attrStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function rupees(paise: number | null | undefined): string {
  return paise == null ? "" : String(paise / 100);
}

export default async function OwnerVenueEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const user = await requireOwner();
  const bundle = await getVenueForOwner(id, user.id);
  if (!bundle) notFound();

  const blocks = await listVenueBlocks(bundle.venue.id);
  const { venue, photos, pricing, hours, amenities, statusHistory } = bundle;

  const attributes = venue.attributes as Record<string, unknown>;
  const pricingBySlot = new Map(pricing.map((row) => [row.slot, row]));
  const proposed = (slot: "half_day" | "full_day" | "hour") => {
    const row = pricingBySlot.get(slot);
    return row?.proposed_amount_paise ?? row?.amount_paise ?? null;
  };

  const hoursByDay = new Map(hours.map((row) => [row.weekday, row]));
  const formHours = Array.from({ length: 7 }, (_, weekday) => {
    const row = hoursByDay.get(weekday);
    return {
      weekday,
      opensAt: row?.opens_at ?? "09:00",
      closesAt: row?.closes_at ?? "18:00",
      isClosed: row?.is_closed ?? false,
    };
  });

  const defaults: VenueFormDefaults = {
    name: venue.name,
    category: venue.category,
    description: venue.description,
    addressLine: venue.address_line,
    city: venue.city,
    state: venue.state,
    pincode: venue.pincode,
    latitude: venue.latitude != null ? String(venue.latitude) : "",
    longitude: venue.longitude != null ? String(venue.longitude) : "",
    contactName: venue.contact_name ?? "",
    contactPhone: venue.contact_phone ?? "",
    contactEmail: venue.contact_email ?? "",
    capacity: venue.capacity != null ? String(venue.capacity) : "",
    lengthM: venue.length_m != null ? String(venue.length_m) : "",
    widthM: venue.width_m != null ? String(venue.width_m) : "",
    indoorOutdoor: attrString(attributes.indoorOutdoor),
    rooms: attrNumberString(attributes.rooms),
    stage: attrBoolean(attributes.stage),
    kitchen: attrBoolean(attributes.kitchen),
    parking: attrBoolean(attributes.parking),
    seatingCapacity: attrNumberString(attributes.seatingCapacity),
    groundType: attrString(attributes.groundType),
    surfaceType: attrString(attributes.surfaceType),
    sports: attrStrings(attributes.sports),
    lighting: attrBoolean(attributes.lighting),
    washrooms: attrBoolean(attributes.washrooms),
    changingRooms: attrBoolean(attributes.changingRooms),
    amenities,
    otherAmenities: "",
    halfDayRupees: rupees(proposed("half_day")),
    fullDayRupees: rupees(proposed("full_day")),
    hourRupees: rupees(proposed("hour")),
    hours: formHours,
    bookingPolicy: venue.booking_policy,
    paymentWindowMinutes: String(venue.payment_window_minutes),
    acceptingBookings: venue.accepting_bookings,
  };

  const proposedBySlot: Record<string, number | null | undefined> = {
    half_day: proposed("half_day"),
    full_day: proposed("full_day"),
    hour: proposed("hour"),
  };
  const issues = venueSubmissionIssues({
    venue,
    photoCount: photos.length,
    proposedBySlot,
    hours,
  });

  const ownerPhotos: OwnerPhoto[] = photos.map((photo) => ({
    id: photo.id,
    url: photoPublicUrl(photo.storage_path),
    alt: photo.alt_text,
  }));
  const ownerBlocks: OwnerBlock[] = blocks.map((block) => ({
    id: block.id,
    startsAt: block.starts_at.toISOString(),
    endsAt: block.ends_at.toISOString(),
    reason: block.reason,
    blockType: block.block_type,
  }));

  const saved = query.saved === "1";

  return (
    <div className="space-y-6">
      <Link
        href="/owner/venues"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        All venues
      </Link>

      <PageHeader
        eyebrow={venue.category === "hall" ? "Community hall" : "Community ground"}
        title={venue.name}
        description={`${venue.city || "No city yet"}${venue.state ? `, ${venue.state}` : ""} · Updated ${formatDateTime(venue.updated_at)}`}
        actions={
          <>
            <StatusBadge
              status={venue.status}
              label={VENUE_STATUS_LABELS[venue.status]}
              tone={venueStatusTone(venue.status)}
            />
            {venue.status === "approved" ? (
              <ButtonLink href={`/venues/${venue.slug}`} variant="secondary" size="sm">
                View public page
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {saved ? <FormAlert tone="success">Venue saved.</FormAlert> : null}

      {venue.status === "rejected" && venue.rejection_reason ? (
        <FormAlert tone="warning">
          <span className="font-semibold">Reviewer note:</span> {venue.rejection_reason}
        </FormAlert>
      ) : null}

      {venue.status === "suspended" ? (
        <FormAlert tone="error">
          This venue is suspended and cannot be submitted. Contact platform support
          before making further changes.
        </FormAlert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <Panel
          title="Venue details"
          description="Saving a published venue sends editorial changes back for review."
        >
          <VenueForm venueId={venue.id} defaults={defaults} />
        </Panel>

        <div className="space-y-6">
          <Panel title="Publication" description="Submit and manage availability">
            <VenuePublishControls
              venueId={venue.id}
              status={venue.status}
              accepting={venue.accepting_bookings}
              issues={issues}
            />
          </Panel>

          <Panel
            title="Photographs"
            description={`${ownerPhotos.length} of ${MAX_PHOTOS_PER_VENUE} used`}
          >
            <VenuePhotoManager
              venueId={venue.id}
              photos={ownerPhotos}
              canUpload={ownerPhotos.length < MAX_PHOTOS_PER_VENUE}
            />
          </Panel>

          <Panel title="Pricing approval" description="Public prices are set by the platform">
            <ul className="space-y-3">
              {pricing.length === 0 ? (
                <li className="text-sm text-muted">
                  No prices recorded yet. Save the venue with proposed prices first.
                </li>
              ) : (
                pricing.map((row) => {
                  const changed =
                    row.proposed_amount_paise != null &&
                    row.proposed_amount_paise !== row.amount_paise;
                  return (
                    <li
                      key={row.slot}
                      className="border-b border-border/70 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium text-foreground">
                          {SLOT_LABELS[row.slot] ?? row.slot}
                        </p>
                        {changed ? (
                          <span className="rounded-full border border-warning/30 bg-warning-soft px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-warning">
                            Proposed
                          </span>
                        ) : row.amount_paise != null ? (
                          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-success">
                            Approved
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground tabular">
                        {formatMoney(row.amount_paise ?? row.proposed_amount_paise)}
                      </p>
                      {changed ? (
                        <p className="mt-0.5 text-[0.68rem] text-muted">
                          Proposed {formatMoney(row.proposed_amount_paise)}. Not public
                          until approved.
                        </p>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
            <p className="mt-3 flex items-start gap-1.5 border-t border-border pt-3 text-[0.68rem] leading-relaxed text-muted">
              <IndianRupee className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              Bookings use approved prices only. Changing a price submits a new proposal.
            </p>
          </Panel>

          <Panel title="Unavailable time" description="Blocks do not need review">
            <div className="mb-3 flex items-start gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-secondary/50 px-3 py-2 text-[0.68rem] leading-relaxed text-muted">
              <CalendarX2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
              Maintenance and private events recorded here cannot overlap new bookings.
            </div>
            <VenueBlocksManager
              venueId={venue.id}
              blocks={ownerBlocks}
              today={todayIstDateKey()}
            />
          </Panel>

          <Panel title="Review history" description="Publication decisions on this venue">
            {statusHistory.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted">
                No review activity yet. Submit the venue when it is ready.
              </p>
            ) : (
              <ol className="space-y-3">
                {statusHistory.map((review) => (
                  <li key={review.id} className="flex items-start gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {VENUE_STATUS_LABELS[review.to_status as VenueStatus] ?? review.to_status}
                      </p>
                      <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted">
                        {formatDateTime(review.created_at)}
                        {review.note ? ` · ${review.note}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-3 text-[0.68rem] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            This editor only loads because the venue belongs to your signed-in owner
            account. Changing the URL cannot open another owner&apos;s venue.
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Operating hours and dates use India Standard Time.
          </div>
        </div>
      </div>
    </div>
  );
}
