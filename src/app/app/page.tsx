import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { MobileVenueCard } from "@/components/mobile/mobile-venue-card";
import { getPublicVenueFacets, listPublicVenues } from "@/lib/venues/queries";
import type { VenueCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Find a space",
  description: "Browse halls and grounds with live availability and clear pricing.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "capacity_desc", label: "Capacity: high to low" },
];

const PRICE_CAPS = [
  { value: "", label: "Any price" },
  { value: "2500000", label: "Under ₹25,000" },
  { value: "5000000", label: "Under ₹50,000" },
  { value: "10000000", label: "Under ₹1,00,000" },
];

function one(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function buildHref(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/app?${query}` : "/app";
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
  const sort = (SORTS.some((item) => item.value === sortParam) ? sortParam : "newest") as
    | "newest"
    | "price_asc"
    | "capacity_desc";
  const maxPriceParam = one(params.maxPricePaise);
  const maxPricePaise = PRICE_CAPS.some((item) => item.value === maxPriceParam)
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
      pageSize: 12,
    }),
    getPublicVenueFacets(category),
  ]);

  const current = {
    category,
    q,
    city,
    sort: sort === "newest" ? undefined : sort,
    maxPricePaise: maxPricePaise ? String(maxPricePaise) : undefined,
    page: page > 1 ? String(page) : undefined,
  };
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const filterCount = [city, maxPricePaise ? String(maxPricePaise) : undefined].filter(Boolean).length;
  const noun =
    category === "hall"
      ? result.total === 1
        ? "hall"
        : "halls"
      : result.total === 1
        ? "ground"
        : "grounds";

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <BrandMark compact href="/app" />
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted">
            Find a space
          </p>
        </div>

        <div className="px-4 pb-3">
          <form action="/app" method="get" role="search" className="flex gap-2">
            <input type="hidden" name="category" value={category} />
            {city ? <input type="hidden" name="city" value={city} /> : null}
            {current.sort ? <input type="hidden" name="sort" value={current.sort} /> : null}
            {current.maxPricePaise ? (
              <input type="hidden" name="maxPricePaise" value={current.maxPricePaise} />
            ) : null}
            <label htmlFor="app-search" className="sr-only">
              Search by venue or city
            </label>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id="app-search"
                name="q"
                type="search"
                enterKeyHint="search"
                defaultValue={q ?? ""}
                placeholder="Venue or city"
                className="h-11 w-full rounded-[var(--radius-md)] border border-border bg-surface pl-9 pr-9 text-sm text-foreground shadow-[var(--shadow-sm)] placeholder:text-muted/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              />
              {q ? (
                <Link
                  href={buildHref(current, { q: undefined, page: undefined })}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-[var(--radius-md)] bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              Go
            </button>
          </form>

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-[var(--radius-md)] border border-border bg-surface-secondary p-1">
            {(
              [
                { value: "hall", label: "Halls" },
                { value: "ground", label: "Grounds" },
              ] as const
            ).map((tab) => {
              const active = category === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={buildHref(
                    { q, city, sort: current.sort, maxPricePaise: current.maxPricePaise },
                    { category: tab.value },
                  )}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "grid h-10 place-items-center rounded-[var(--radius-sm)] bg-surface text-sm font-semibold text-foreground shadow-[var(--shadow-sm)]"
                      : "grid h-10 place-items-center rounded-[var(--radius-sm)] text-sm font-medium text-muted hover:text-foreground"
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            {result.total} {noun}
          </p>
          <details className="group relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-foreground-soft marker:content-none hover:border-border-strong">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filters
              {filterCount > 0 ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.62rem] font-bold text-white">
                  {filterCount}
                </span>
              ) : null}
            </summary>

            <form
              action="/app"
              method="get"
              className="absolute right-0 top-11 z-40 w-[17rem] rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-lg)]"
            >
              <input type="hidden" name="category" value={category} />
              {q ? <input type="hidden" name="q" value={q} /> : null}

              <label htmlFor="filter-city" className="text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-muted">
                City
              </label>
              <select
                id="filter-city"
                name="city"
                defaultValue={city ?? ""}
                className="mt-1.5 h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground"
              >
                <option value="">Any city</option>
                {facets.cities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} ({option.count})
                  </option>
                ))}
              </select>

              <label htmlFor="filter-price" className="mt-3 block text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Price
              </label>
              <select
                id="filter-price"
                name="maxPricePaise"
                defaultValue={maxPricePaise ? String(maxPricePaise) : ""}
                className="mt-1.5 h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground"
              >
                {PRICE_CAPS.map((option) => (
                  <option key={option.value || "any"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label htmlFor="filter-sort" className="mt-3 block text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Sort
              </label>
              <select
                id="filter-sort"
                name="sort"
                defaultValue={sort}
                className="mt-1.5 h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-sm text-foreground"
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="h-10 flex-1 rounded-[var(--radius-sm)] bg-primary text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  Apply
                </button>
                <Link
                  href={`/app?category=${category}`}
                  className="grid h-10 place-items-center rounded-[var(--radius-sm)] border border-border px-3 text-sm font-medium text-foreground-soft hover:bg-surface-secondary"
                >
                  Reset
                </Link>
              </div>
            </form>
          </details>
        </div>

        {result.items.length === 0 ? (
          <div className="mt-10 rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-surface px-5 py-10 text-center">
            <p className="font-display text-base font-semibold text-foreground">No venues match</p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
              Try a different city, a wider price range or a different search word.
            </p>
            <Link
              href={`/app?category=${category}`}
              className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-4">
            {result.items.map((venue, index) => (
              <li key={venue.id}>
                <MobileVenueCard venue={venue} priority={index === 0} />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav aria-label="Pages" className="mt-5 flex items-center justify-between">
            {page > 1 ? (
              <Link
                href={buildHref(current, { page: String(page - 1) })}
                className="inline-flex h-10 items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm font-medium text-foreground-soft"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Link>
            ) : (
              <span />
            )}
            <p className="text-xs text-muted">
              Page {page} of {totalPages}
            </p>
            {page < totalPages ? (
              <Link
                href={buildHref(current, { page: String(page + 1) })}
                className="inline-flex h-10 items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm font-medium text-foreground-soft"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}

        <p className="mt-8 text-center text-[0.68rem] leading-relaxed text-muted">
          Listings update automatically. New venues appear here without an app update.
        </p>
      </div>
    </div>
  );
}
