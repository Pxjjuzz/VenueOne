import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarX2,
  CheckCircle2,
  Clock3,
  ImageOff,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getVenueForAdmin, listVenueBlocks } from "@/lib/venues/queries";
import { venueSubmissionIssues } from "@/lib/validation";
import { PageHeader } from "@/components/ui/page-header";
import { InfoRow, Panel } from "@/components/ui/stat-card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { AdminVenueDecision } from "@/components/admin/admin-venue-decision";
import { AdminModelManager } from "@/components/admin/admin-model-manager";
import { formatDateTime, formatMoney } from "@/lib/format";
import { photoPublicUrl } from "@/lib/storage";
import { getVenueModelForAdmin } from "@/lib/models/queries";
import { modelPublicUrl } from "@/lib/models/storage";
import {
  VENUE_STATUS_LABELS,
  venueStatusTone,
  type VenueStatus,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Review venue",
  robots: { index: false, follow: false },
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_LABELS: Record<string, string> = {
  half_day: "Half day",
  full_day: "Full day",
  hour: "Hourly",
};

function attrString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function attrStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function attrFlag(value: unknown, label: string): string | null {
  return value === true ? label : null;
}

function isoDate(value: Date | string | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

export default async function AdminVenueReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  await requireAdmin();
  const bundle = await getVenueForAdmin(id);
  if (!bundle) notFound();

  const blocks = await listVenueBlocks(bundle.venue.id);
  const venueModel = await getVenueModelForAdmin(bundle.venue.id);
  const { venue, photos, pricing, hours, amenities, statusHistory } = bundle;
  const attributes = venue.attributes as Record<string, unknown>;

  const proposedBySlot: Record<string, number | null | undefined> = {};
  for (const row of pricing) {
    proposedBySlot[row.slot] = row.proposed_amount_paise ?? row.amount_paise;
  }
  const issues = venueSubmissionIssues({
    venue,
    photoCount: photos.length,
    proposedBySlot,
    hours,
  });

  const editorialChanges = pricing.filter(
    (row) =>
      row.proposed_amount_paise != null &&
      row.proposed_amount_paise !== row.amount_paise,
  );

  const facilities = [
    attrFlag(attributes.stage, "Stage"),
    attrFlag(attributes.kitchen, "Kitchen"),
    attrFlag(attributes.parking, "Parking"),
    attrFlag(attributes.lighting, "Floodlights"),
    attrFlag(attributes.washrooms, "Washrooms"),
    attrFlag(attributes.changingRooms, "Changing rooms"),
  ].filter((item): item is string => Boolean(item));

  const detailRows: { label: string; value: string }[] = [
    { label: "Category", value: venue.category === "hall" ? "Community hall" : "Community ground" },
    { label: "Booking policy", value: venue.booking_policy === "instant" ? "Instant booking" : "Owner approval" },
    { label: "Payment window", value: `${venue.payment_window_minutes} minutes` },
    { label: "Accepting bookings", value: venue.accepting_bookings ? "Yes" : "Paused" },
  ];
  if (venue.category === "hall") {
    if (attrString(attributes.indoorOutdoor)) {
      detailRows.push({ label: "Indoor / outdoor", value: attrString(attributes.indoorOutdoor) });
    }
    if (attributes.rooms != null) {
      detailRows.push({ label: "Rooms", value: String(attributes.rooms) });
    }
    if (attributes.seatingCapacity != null) {
      detailRows.push({ label: "Seating capacity", value: String(attributes.seatingCapacity) });
    }
  } else {
    if (attrString(attributes.groundType)) {
      detailRows.push({ label: "Ground type", value: attrString(attributes.groundType) });
    }
    if (attrString(attributes.surfaceType)) {
      detailRows.push({ label: "Surface", value: attrString(attributes.surfaceType) });
    }
    if (attrStrings(attributes.sports).length) {
      detailRows.push({ label: "Sports", value: attrStrings(attributes.sports).join(", ") });
    }
  }
  if (venue.capacity) detailRows.push({ label: "Capacity", value: String(venue.capacity) });
  if (venue.length_m) detailRows.push({ label: "Length", value: `${venue.length_m} m` });
  if (venue.width_m) detailRows.push({ label: "Width", value: `${venue.width_m} m` });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/venues"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Venue review queue
      </Link>

      <PageHeader
        eyebrow={`${venue.category === "hall" ? "Community hall" : "Community ground"} · ${venue.city || "no city"}`}
        title={venue.name}
        description={`Submitted ${venue.submitted_at ? formatDateTime(venue.submitted_at) : "—"} · Last updated ${formatDateTime(venue.updated_at)}`}
        actions={
          <>
            <StatusBadge
              status={venue.status}
              label={VENUE_STATUS_LABELS[venue.status]}
              tone={venueStatusTone(venue.status)}
            />
            {venue.status === "approved" ? (
              <ButtonLink href={`/venues/${venue.slug}`} variant="secondary" size="sm">
                Public page
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {venue.rejection_reason ? (
        <FormAlert tone="warning">
          <span className="font-semibold">Current reviewer note:</span>{" "}
          {venue.rejection_reason}
        </FormAlert>
      ) : null}

      {issues.length > 0 ? (
        <div className="rounded-[var(--radius-md)] border border-border bg-surface-secondary/50 px-4 py-4">
          <p className="text-sm font-semibold text-foreground">
            Submission gaps recorded against this venue
          </p>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
            {issues.map((issue) => (
              <li key={issue} className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                {issue}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.68rem] leading-relaxed text-muted">
            These checks are informational here. Approval still requires valid required
            pricing for the venue category.
          </p>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-success/25 bg-success-soft px-3.5 py-2.5 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          The automatic submission checks pass for this venue.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        <div className="space-y-6">
          <Panel
            title="Photographs"
            description={`${photos.length} uploaded · first image is the public cover`}
          >
            {photos.length === 0 ? (
              <div className="rounded-[var(--radius-sm)] border border-dashed border-border-strong bg-surface-secondary/50 px-4 py-8 text-center">
                <ImageOff className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-foreground">No photographs uploaded</p>
                <p className="mt-1 text-xs text-muted">At least one real photograph is required before submission.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((photo) => (
                  <li key={photo.id} className="overflow-hidden rounded-[var(--radius-sm)] border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPublicUrl(photo.storage_path)}
                      alt={photo.alt_text}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                    <p className="truncate px-2 py-1.5 text-[0.62rem] text-muted">{photo.alt_text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="3D model"
            description="Interior exploration, managed by administrators only"
          >
            <AdminModelManager
              venueId={venue.id}
              venueName={venue.name}
              model={
                venueModel
                  ? {
                      status: venueModel.status,
                      accuracy: venueModel.accuracy,
                      version: venueModel.version,
                      fileBytes: venueModel.file_bytes,
                      notes: venueModel.notes,
                      uploadedAt: isoDate(venueModel.uploaded_at),
                      publishedAt: isoDate(venueModel.published_at),
                      updatedAt: isoDate(venueModel.updated_at) ?? new Date().toISOString(),
                      rejectionReason: venueModel.rejection_reason,
                    }
                  : null
              }
              modelUrl={
                venueModel?.storage_path ? modelPublicUrl(venueModel.storage_path) : null
              }
              posterUrl={
                venueModel?.preview_path ? modelPublicUrl(venueModel.preview_path) : null
              }
            />
          </Panel>

          <Panel title="Description" description="Owner-supplied copy">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-strong">
              {venue.description || "No description recorded."}
            </p>
          </Panel>

          <Panel title="Listing details" description="Content that will be published">
            <dl className="divide-y divide-border">
              <InfoRow
                label="Address"
                value={
                  <span className="inline-flex items-start justify-end gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                    {venue.address_line}, {venue.city}, {venue.state} {venue.pincode}
                  </span>
                }
              />
              <InfoRow label="Contact phone" value={venue.contact_phone || "—"} />
              <InfoRow label="Contact email" value={venue.contact_email || "—"} />
              {detailRows.map((row) => (
                <InfoRow key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>

            {facilities.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">Facilities</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {facilities.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {amenities.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">Amenities</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {amenities.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel
            title="Pricing"
            description="Approved amounts are public; proposed amounts wait for a decision"
          >
            <div className="space-y-3">
              {pricing.length === 0 ? (
                <p className="text-sm text-muted">No pricing rows recorded.</p>
              ) : (
                pricing.map((row) => {
                  const changed =
                    row.proposed_amount_paise != null &&
                    row.proposed_amount_paise !== row.amount_paise;
                  return (
                    <div
                      key={row.slot}
                      className="flex items-start justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {SLOT_LABELS[row.slot] ?? row.slot}
                        </p>
                        <p className="mt-0.5 text-[0.68rem] text-muted">
                          Approved {formatMoney(row.amount_paise)}
                          {row.approved_at ? ` · ${formatDateTime(row.approved_at)}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground tabular">
                          {formatMoney(row.proposed_amount_paise ?? row.amount_paise)}
                        </p>
                        <span
                          className={
                            changed
                              ? "text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-warning"
                              : "text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted"
                          }
                        >
                          {changed ? "Proposed" : "Unchanged"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {editorialChanges.length > 0 ? (
              <p className="mt-3 flex items-start gap-1.5 border-t border-border pt-3 text-[0.68rem] leading-relaxed text-warning">
                <IndianRupee className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Approving publishes the proposed prices shown above.
              </p>
            ) : null}
          </Panel>

          <Panel title="Operating hours" description="India Standard Time">
            <ul className="divide-y divide-border">
              {WEEKDAYS.map((day, weekday) => {
                const row = hours.find((item) => item.weekday === weekday);
                return (
                  <li key={day} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-muted">{day}</span>
                    <span className={row?.is_closed || !row ? "text-muted" : "font-medium text-foreground"}>
                      {!row || row.is_closed ? "Closed" : `${row.opens_at} – ${row.closes_at}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Unavailable time" description="Owner and platform blocks">
            {blocks.length === 0 ? (
              <p className="text-sm text-muted">No future unavailable time recorded.</p>
            ) : (
              <ul className="space-y-2">
                {blocks.map((block) => (
                  <li key={block.id} className="flex items-start gap-2.5 border-b border-border/70 pb-2 last:border-0 last:pb-0">
                    <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{block.reason}</p>
                      <p className="mt-0.5 text-[0.68rem] text-muted">
                        {formatDateTime(block.starts_at)} → {formatDateTime(block.ends_at)} ·{" "}
                        {block.block_type}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Review history" description="Publication transitions for this venue">
            {statusHistory.length === 0 ? (
              <p className="text-sm text-muted">No review activity recorded.</p>
            ) : (
              <ol className="space-y-3">
                {statusHistory.map((review) => (
                  <li key={review.id} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {VENUE_STATUS_LABELS[review.to_status as VenueStatus] ?? review.to_status}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateTime(review.created_at)}
                        {review.note ? ` · ${review.note}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Publication decision" description="Approve or return the listing">
            <AdminVenueDecision venueId={venue.id} status={venue.status} />
          </Panel>

          <Panel title="Owner" description="The account responsible for this listing">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-muted-strong">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  {bundle.ownerName || "No owner name"}
                  {bundle.ownerBusinessName ? (
                    <span className="mt-0.5 block text-xs text-muted">{bundle.ownerBusinessName}</span>
                  ) : null}
                </span>
              </li>
              {bundle.ownerEmail ? (
                <li className="flex items-start gap-2.5 text-muted-strong">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`mailto:${bundle.ownerEmail}`} className="break-all hover:text-foreground">
                    {bundle.ownerEmail}
                  </a>
                </li>
              ) : null}
              {bundle.ownerPhone ? (
                <li className="flex items-start gap-2.5 text-muted-strong">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`tel:${bundle.ownerPhone}`} className="hover:text-foreground">
                    {bundle.ownerPhone}
                  </a>
                </li>
              ) : null}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-[0.68rem] leading-relaxed text-muted">
              Owner access and venue publication are separate approvals. This decision
              affects only this listing.
            </p>
          </Panel>

          <Panel title="Record" description="Timestamps and identifiers">
            <dl className="space-y-2 text-xs text-muted">
              <div className="flex justify-between gap-3">
                <dt>Created</dt>
                <dd className="text-foreground">{formatDateTime(venue.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Published</dt>
                <dd className="text-foreground">{venue.published_at ? formatDateTime(venue.published_at) : "Not published"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Venue ID</dt>
                <dd className="break-all text-right text-foreground">{venue.id}</dd>
              </div>
            </dl>
          </Panel>

          <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-3 text-[0.68rem] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            Decisions are recorded in the venue review history and the platform audit log.
          </div>

          <div className="flex items-center gap-2 text-xs text-muted">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Times are shown in India Standard Time.
          </div>
        </div>
      </div>
    </div>
  );
}
