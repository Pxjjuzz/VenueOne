import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ImageOff,
  MapPin,
  Pencil,
  Plus,
  Store,
} from "lucide-react";
import { requireOwner } from "@/lib/auth/session";
import { listOwnerVenues } from "@/lib/venues/queries";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CreateVenueForm } from "@/components/owner/create-venue-form";
import { formatDateTime, formatMoneyRange, pluralize } from "@/lib/format";
import { photoPublicUrl } from "@/lib/storage";
import { VENUE_STATUS_LABELS, venueStatusTone } from "@/lib/types";

export const metadata: Metadata = {
  title: "Your venues",
  robots: { index: false, follow: false },
};

export default async function OwnerVenuesPage() {
  const user = await requireOwner();
  const venues = await listOwnerVenues(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Venue owner"
        title="Your venues"
        description="Every listing here belongs to your account. Only approved venues appear in the public directory."
        actions={
          <>
            <CreateVenueForm label="New venue" />
            <ButtonLink href="/owner" variant="secondary" size="sm">
              Overview
            </ButtonLink>
          </>
        }
      />

      {venues.length === 0 ? (
        <EmptyState
          variant="venue"
          title="Start with a draft"
          description="A draft is private and can be incomplete. Add the description, address, photographs, operating hours and proposed prices, then submit it for publication review."
          action={<CreateVenueForm label="Create your first draft" />}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">
            {pluralize(venues.length, "listing")} on this account
          </p>
          <ul className="grid gap-4 lg:grid-cols-2">
            {venues.map((venue) => {
              const photo = venue.photo_path ? photoPublicUrl(venue.photo_path) : null;
              return (
                <li key={venue.id}>
                  <article className="surface-card h-full overflow-hidden">
                    <div className="flex gap-4 p-4 sm:p-5">
                      <div className="relative hidden h-24 w-32 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface-secondary sm:block">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                            <ImageOff className="h-4 w-4" aria-hidden="true" />
                            No photo
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={venue.status}
                            label={VENUE_STATUS_LABELS[venue.status]}
                            tone={venueStatusTone(venue.status)}
                          />
                          <span className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                            {venue.category === "hall" ? "Hall" : "Ground"}
                          </span>
                        </div>

                        <h2 className="mt-2 truncate font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                          {venue.name}
                        </h2>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          {venue.city ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                              {venue.city}
                            </span>
                          ) : (
                            <span className="text-warning">Add the location to submit</span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {pluralize(venue.photo_count, "photo")}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-medium text-foreground tabular">
                          {formatMoneyRange(venue.min_price_paise, venue.max_price_paise)}
                        </p>
                        <p className="mt-1 text-[0.68rem] text-muted">
                          Updated {formatDateTime(venue.updated_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-secondary/30 px-4 py-3 sm:px-5">
                      <div className="flex items-center gap-2">
                        <ButtonLink href={`/owner/venues/${venue.id}`} size="sm">
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit venue
                        </ButtonLink>
                        {venue.status === "approved" ? (
                          <ButtonLink
                            href={`/venues/${venue.slug}`}
                            variant="ghost"
                            size="sm"
                          >
                            View public page
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </ButtonLink>
                        ) : null}
                      </div>
                      {venue.status === "rejected" ? (
                        <Link
                          href={`/owner/venues/${venue.id}`}
                          className="text-xs font-medium text-error underline underline-offset-4"
                        >
                          Read reviewer notes
                        </Link>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-surface-secondary/40 px-4 py-4">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-foreground">Need to block a date?</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Open the venue and use the unavailable-time panel. Blocks do not require
                review and prevent new bookings from overlapping.
              </p>
              <Link
                href={venues[0] ? `/owner/venues/${venues[0].id}` : "/owner/venues"}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                Add unavailable time
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
