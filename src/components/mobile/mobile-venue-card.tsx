import Image from "next/image";
import Link from "next/link";
import { Building2, ChevronRight, Images, MapPin, Trees, Users } from "lucide-react";
import { formatMoney, formatNumber } from "@/lib/format";
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
  const price = venue.min_price_paise != null ? formatMoney(venue.min_price_paise) : null;

  return (
    <article className="overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-[var(--shadow-md)] transition-transform duration-150 ease-out active:scale-[0.985]">
      <Link
        href={`/app/venues/${venue.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-secondary">
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
            <div className="grid h-full place-items-center bg-[linear-gradient(150deg,#e9eee4,#d7e1d0)] text-primary/60">
              {isHall ? (
                <Building2 className="h-10 w-10" aria-hidden="true" />
              ) : (
                <Trees className="h-10 w-10" aria-hidden="true" />
              )}
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,rgba(9,14,11,0.62),transparent)]"
            aria-hidden="true"
          />

          {venue.photo_count > 1 ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[rgba(12,18,14,0.55)] px-2.5 py-1 text-[0.66rem] font-semibold text-white backdrop-blur">
              <Images className="h-3 w-3" aria-hidden="true" />
              {venue.photo_count}
            </span>
          ) : null}

          <p className="absolute bottom-3 left-4 text-white">
            <span className="block text-[0.6rem] font-medium uppercase tracking-[0.12em] text-white/75">
              {price ? (isHall ? "Half day from" : "Per hour") : "Pricing"}
            </span>
            <span className="text-[1.08rem] font-semibold leading-tight tabular">
              {price ?? "Pending"}
            </span>
          </p>
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[1.02rem] font-semibold leading-snug tracking-[-0.02em] text-foreground">
              {venue.name}
            </h2>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          </div>

          {city ? (
            <p className="mt-1 flex items-center gap-1.5 text-[0.82rem] text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {city}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {venue.capacity != null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-2.5 py-1 text-[0.7rem] font-medium text-foreground-soft">
                <Users className="h-3 w-3" aria-hidden="true" />
                Up to {formatNumber(venue.capacity)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[0.7rem] font-semibold text-primary">
              {venue.booking_policy === "instant" ? "Instant booking" : "On request"}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
