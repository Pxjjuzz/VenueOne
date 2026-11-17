import Image from "next/image";
import Link from "next/link";
import { Building2, Images, MapPin, Trees, Users } from "lucide-react";
import { formatMoneyRange, formatNumber } from "@/lib/format";
import { photoPublicUrl } from "@/lib/storage";
import type { VenueWithOwner } from "@/lib/types";

export function MobileVenueCard({
  venue,
  priority = false,
}: {
  venue: VenueWithOwner;
  priority?: boolean;
}) {
  const photo = venue.photo_path ? photoPublicUrl(venue.photo_path) : null;
  const city = [venue.city, venue.state].filter(Boolean).join(", ");
  const isHall = venue.category === "hall";
  const price =
    venue.min_price_paise != null
      ? formatMoneyRange(venue.min_price_paise, venue.max_price_paise)
      : "Pricing pending";

  return (
    <article className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-sm)]">
      <Link
        href={`/app/venues/${venue.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-secondary">
          {photo ? (
            <Image
              src={photo}
              alt={`Photograph of ${venue.name}`}
              fill
              sizes="(max-width: 520px) 100vw, 520px"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="grid h-full place-items-center text-muted">
              {isHall ? (
                <Building2 className="h-8 w-8" aria-hidden="true" />
              ) : (
                <Trees className="h-8 w-8" aria-hidden="true" />
              )}
            </div>
          )}

          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.9)] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-foreground-soft backdrop-blur">
            {isHall ? <Building2 className="h-3 w-3" aria-hidden="true" /> : <Trees className="h-3 w-3" aria-hidden="true" />}
            {isHall ? "Hall" : "Ground"}
          </span>

          {venue.photo_count > 1 ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[rgba(32,35,31,0.72)] px-2 py-1 text-[0.62rem] font-medium text-white backdrop-blur">
              <Images className="h-3 w-3" aria-hidden="true" />
              {venue.photo_count}
            </span>
          ) : null}

          <span className="absolute bottom-3 left-3 rounded-full bg-[rgba(32,35,31,0.82)] px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            {price}
            {!isHall && venue.min_price_paise != null ? " / hour" : ""}
          </span>
        </div>

        <div className="p-4">
          <h2 className="font-display text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] text-foreground">
            {venue.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {city ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                {city}
              </span>
            ) : null}
            {venue.capacity != null ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
                Up to {formatNumber(venue.capacity)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
