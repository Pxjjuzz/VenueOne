import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Building2, MapPin, Ruler, Trees, Users } from "lucide-react";
import { formatMoneyRange, formatNumber } from "@/lib/format";
import { photoPublicUrl } from "@/lib/storage";
import type { VenueWithOwner } from "@/lib/types";
import { cn } from "@/lib/cn";

function VenuePlaceholder({ category }: { category: "hall" | "ground" }) {
  if (category === "hall") {
    return (
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#efede5,#e1ddd0)]">
        <svg viewBox="0 0 400 260" className="h-full w-full" aria-hidden="true" fill="none">
          <path d="M84 222V122l116-58 116 58v100" stroke="#b5b3a7" strokeWidth="1.4" />
          <path d="M144 222v-50a56 56 0 0 1 112 0v50" stroke="#9ca193" strokeWidth="1.6" />
          <path d="M84 222h232" stroke="#244c3b" strokeWidth="2" strokeLinecap="round" />
          <rect x="84" y="124" width="232" height="6" fill="#c8d59b" opacity="0.55" />
          <path d="M118 222V166h26v56M256 222v-56h26v56" stroke="#b5b3a7" />
        </svg>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 bg-[linear-gradient(145deg,#e7ecd8,#cdd7a7)]">
      <svg viewBox="0 0 400 260" className="h-full w-full" aria-hidden="true" fill="none">
        <rect x="64" y="46" width="272" height="168" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
        <path d="M200 46v168" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
        <circle cx="200" cy="130" r="34" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
        <path d="M64 82h42v96H64M336 82h-42v96h42" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
        <path d="M64 234h272" stroke="#244c3b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function VenueCard({ venue, priority = false }: { venue: VenueWithOwner; priority?: boolean }) {
  const attributes = venue.attributes as Record<string, unknown>;
  const photo = venue.photo_path ? photoPublicUrl(venue.photo_path) : null;
  const city = [venue.city, venue.state].filter(Boolean).join(", ");
  const isHall = venue.category === "hall";
  const priceLabel =
    venue.min_price_paise != null
      ? `${formatMoneyRange(venue.min_price_paise, venue.max_price_paise)}${isHall ? "" : " / hour"}`
      : "Pricing pending";

  return (
    <article className="group overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface transition-[box-shadow,border-color] duration-300 hover:border-border-strong hover:shadow-[var(--shadow-md)]">
      <Link href={`/venues/${venue.slug}`} className="block focus-visible:outline-none">
        <div className="relative aspect-[4/3] overflow-hidden border-b border-border">
          {photo ? (
            <Image
              src={photo}
              alt={`Photograph of ${venue.name}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
              priority={priority}
            />
          ) : (
            <VenuePlaceholder category={venue.category} />
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-[rgba(255,255,255,0.88)] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-foreground-soft backdrop-blur">
              {isHall ? <Building2 className="h-3 w-3" aria-hidden="true" /> : <Trees className="h-3 w-3" aria-hidden="true" />}
              {isHall ? "Hall" : "Ground"}
            </span>
            {venue.photo_count > 1 ? (
              <span className="rounded-full bg-[rgba(32,35,31,0.72)] px-2 py-1 text-[0.6rem] font-medium text-white backdrop-blur">
                {venue.photo_count} photos
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-[1.08rem] font-semibold tracking-[-0.025em] text-foreground">
              <Link href={`/venues/${venue.slug}`} className="hover:text-primary">
                {venue.name}
              </Link>
            </h2>
            {city ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{city}</span>
              </p>
            ) : null}
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-white">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.7rem] text-muted">
          {venue.capacity != null ? (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3 w-3" aria-hidden="true" />
              Up to {formatNumber(venue.capacity)}
            </span>
          ) : null}
          {attributes.lengthM && attributes.widthM ? (
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="h-3 w-3" aria-hidden="true" />
              {String(attributes.lengthM)} × {String(attributes.widthM)} m
            </span>
          ) : null}
          {!isHall && typeof attributes.surfaceType === "string" ? (
            <span>{attributes.surfaceType}</span>
          ) : null}
          {isHall && typeof attributes.indoorOutdoor === "string" ? (
            <span>{attributes.indoorOutdoor}</span>
          ) : null}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">
              {venue.min_price_paise != null ? (isHall ? "From" : "Per hour") : "Price"}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground tabular">{priceLabel}</p>
          </div>
          <Link
            href={`/venues/${venue.slug}`}
            className={cn(
              "text-xs font-semibold text-primary underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current",
            )}
          >
            View venue
          </Link>
        </div>
      </div>
    </article>
  );
}
