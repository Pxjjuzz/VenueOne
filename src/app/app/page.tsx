import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Compass } from "lucide-react";
import { ExploreControls } from "@/components/mobile/explore-controls";
import { MobileVenueCard } from "@/components/mobile/mobile-venue-card";
import {
  EXPLORE_PRICE_CAPS,
  EXPLORE_SORTS,
  buildExploreHref,
  type ExploreSort,
} from "@/components/mobile/explore-options";
import { getPublicVenueFacets, listPublicVenues } from "@/lib/venues/queries";
import type { VenueCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse halls and grounds with live availability and clear pricing.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export default async function MobileExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const category: VenueCategory = one(params.category) === "ground" ? "ground" : "hall";
  const q = one(params.q)?.slice(0, 100);
  const city = one(params.city)?.slice(0, 80);
  const sortParam = one(params.sort);
  const sort: ExploreSort = EXPLORE_SORTS.some((item) => item.value === sortParam)
    ? (sortParam as ExploreSort)
    : "newest";
  const maxPriceParam = one(params.maxPricePaise);
  const maxPricePaise = EXPLORE_PRICE_CAPS.some((item) => item.value === maxPriceParam)
    ? Number(maxPriceParam)
    : undefined;
  const pageParam = Number(one(params.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;

  const [result, facets] = await Promise.all([
    listPublicVenues({
      category,
      q,
      city,
      sort,
      maxPricePaise: maxPricePaise && maxPricePaise > 0 ? maxPricePaise : undefined,
      page,
      pageSize: 24,
    }),
    getPublicVenueFacets(category),
  ]);

  const base = {
    category,
    q,
    city,
    sort: sort === "newest" ? undefined : sort,
    maxPricePaise: maxPricePaise ? String(maxPricePaise) : undefined,
  };
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const filterCount = [city, base.maxPricePaise].filter(Boolean).length;
  const noun = category === "hall" ? "halls" : "grounds";

  return (
    <div className="pb-10">
      <ExploreControls
        base={base}
        q={q}
        city={city}
        sort={sort}
        maxPricePaise={base.maxPricePaise}
        filterCount={filterCount}
        cities={facets.cities}
      />

      <div className="px-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.82rem] text-muted">
            <span className="font-semibold text-foreground">{result.total}</span>{" "}
            {result.total === 1 ? noun.slice(0, -1) : noun}
            {city ? ` in ${city}` : ""}
          </p>
          {filterCount > 0 ? (
            <Link
              href={`/app?category=${category}`}
              className="text-[0.76rem] font-semibold text-primary"
            >
              Clear filters
            </Link>
          ) : null}
        </div>

        {result.items.length === 0 ? (
          <div className="mt-6 rounded-[var(--radius-lg)] bg-surface px-6 py-12 text-center shadow-[var(--shadow-sm)]">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-secondary text-muted">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[1.02rem] font-semibold text-foreground">No spaces match</p>
            <p className="mx-auto mt-1.5 max-w-[16rem] text-[0.84rem] leading-relaxed text-muted">
              Try another city, a wider price range or a shorter search word.
            </p>
            <Link
              href={`/app?category=${category}`}
              className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-[0.86rem] font-semibold text-white"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {result.items.map((venue, index) => (
              <li
                key={venue.id}
                className="app-rise"
                style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
              >
                <MobileVenueCard venue={venue} priority={index === 0} />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Pages" className="mt-6 flex items-center justify-between">
            {page > 1 ? (
              <Link
                href={buildExploreHref(base, { page: String(page - 1) })}
                aria-label="Previous page"
                className="grid h-11 w-11 place-items-center rounded-full bg-surface text-foreground shadow-[var(--shadow-sm)]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
            <p className="text-[0.76rem] text-muted">
              Page {page} of {totalPages}
            </p>
            {page < totalPages ? (
              <Link
                href={buildExploreHref(base, { page: String(page + 1) })}
                aria-label="Next page"
                className="grid h-11 w-11 place-items-center rounded-full bg-surface text-foreground shadow-[var(--shadow-sm)]"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
