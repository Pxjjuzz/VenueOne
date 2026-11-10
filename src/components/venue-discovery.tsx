import Link from "next/link";
import { Building2, Filter, MapPin, Search, SlidersHorizontal, Trees, X } from "lucide-react";
import { VenueCard } from "@/components/venue-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/table";
import { Input, Label } from "@/components/ui/field";
import { Select, type SelectOption } from "@/components/ui/select";
import { formatNumber } from "@/lib/format";
import {
  getPublicVenueFacets,
  listPublicVenues,
  type VenueListFilters,
} from "@/lib/venues/queries";
import type { VenueCategory } from "@/lib/types";

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function num(value: string | string[] | undefined): number | undefined {
  const parsed = Number(one(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function filtersFromParams(category: VenueCategory, params: SearchParams): VenueListFilters {
  const sortRaw = one(params.sort);
  const sort =
    sortRaw === "price_asc" || sortRaw === "price_desc" || sortRaw === "capacity_desc"
      ? sortRaw
      : "newest";
  return {
    category,
    q: one(params.q).slice(0, 100) || undefined,
    city: one(params.city) || undefined,
    minPricePaise: num(params.minPrice) ? num(params.minPrice)! * 100 : undefined,
    maxPricePaise: num(params.maxPrice) ? num(params.maxPrice)! * 100 : undefined,
    minCapacity: num(params.capacity),
    amenity: one(params.amenity) || undefined,
    sport: one(params.sport) || undefined,
    surface: one(params.surface) || undefined,
    sort,
    page: num(params.page) ?? 1,
    pageSize: 12,
  };
}

const sortOptions: SelectOption[] = [
  { value: "newest", label: "Recently added" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "capacity_desc", label: "Largest capacity" },
];

const copy = {
  hall: {
    eyebrow: "Community halls",
    title: "Rooms with room to gather.",
    description:
      "Find a hall for a family function, a public meeting, a workshop or a celebration. Compare capacity, facilities and clear half-day or full-day pricing.",
    emptyTitle: "Your next gathering starts here.",
    emptyDescription:
      "No community halls have been listed yet. Check back soon as new spaces become available — or invite a venue you know to apply.",
    icon: Building2,
  },
  ground: {
    eyebrow: "Community grounds",
    title: "Find your next playing field.",
    description:
      "Discover open grounds and turfs for sport, practice and outdoor events. Filter by sport, surface and dimensions, then book by the hour.",
    emptyTitle: "Find your next playing field.",
    emptyDescription:
      "We are preparing to bring community grounds onto the platform. No grounds are listed yet, and nothing here is invented.",
    icon: Trees,
  },
} as const;

export async function VenueDiscoveryPage({
  category,
  searchParams,
}: {
  category: VenueCategory;
  searchParams: SearchParams;
}) {
  const filters = filtersFromParams(category, searchParams);
  const [result, facets] = await Promise.all([
    listPublicVenues(filters),
    getPublicVenueFacets(category),
  ]);
  const meta = copy[category];
  const Icon = meta.icon;

  const activeFilters = [
    filters.q,
    filters.city,
    filters.amenity,
    filters.sport,
    filters.surface,
    filters.minPricePaise,
    filters.maxPricePaise,
    filters.minCapacity,
  ].filter(Boolean).length;

  const queryWithoutPage: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (key !== "page") queryWithoutPage[key] = one(value) || undefined;
  }

  const sortLabel = category === "hall" ? "Sort halls" : "Sort grounds";

  return (
    <div>
      <section
        className={
          category === "hall"
            ? "relative overflow-hidden border-b border-border bg-[#f1eee4]"
            : "relative overflow-hidden border-b border-border bg-[#e9eed8]"
        }
      >
        <div className="pointer-events-none absolute inset-0 grid-floor opacity-50" aria-hidden="true" />
        <div className="container-page relative grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {meta.eyebrow}
            </p>
            <h1 className="display-2 mt-3 max-w-2xl">{meta.title}</h1>
            <p className="measure mt-4 text-[0.9375rem] leading-relaxed text-muted-strong">
              {meta.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                {result.total === 0
                  ? "No approved venues yet"
                  : `${formatNumber(result.total)} approved ${result.total === 1 ? "venue" : "venues"}`}
              </span>
              <span>Real photographs only</span>
              <span>{category === "hall" ? "Half-day or full-day" : "Hourly booking"}</span>
            </div>
          </div>

          <div className="relative hidden h-52 lg:block" aria-hidden="true">
            {category === "hall" ? (
              <svg viewBox="0 0 420 220" className="h-full w-full" fill="none">
                <path d="M54 196V92l116-60 116 60v104" stroke="#b9b6a9" strokeWidth="1.4" />
                <path d="M118 196v-56a52 52 0 0 1 104 0v56" stroke="#244c3b" strokeWidth="2" />
                <path d="M54 196h232" stroke="#244c3b" strokeWidth="2" strokeLinecap="round" />
                <path d="M118 196v-56a52 52 0 0 1 104 0v56" fill="#c8d59b" opacity="0.3" />
                <rect x="286" y="52" width="80" height="12" fill="#c8d59b" />
                <rect x="286" y="78" width="56" height="6" fill="#b9b6a9" />
                <rect x="286" y="94" width="68" height="6" fill="#b9b6a9" />
                <path d="M54 196v16M286 196v16" stroke="#244c3b" strokeWidth="1.2" />
                <path d="M54 206h232" stroke="#244c3b" strokeWidth="1" strokeDasharray="3 4" />
              </svg>
            ) : (
              <svg viewBox="0 0 420 220" className="h-full w-full" fill="none">
                <rect x="36" y="26" width="348" height="168" fill="#dbe4b8" stroke="#aab97b" />
                <path d="M210 26v168" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
                <circle cx="210" cy="110" r="36" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
                <circle cx="210" cy="110" r="3" fill="#244c3b" />
                <path d="M36 66h48v88H36M384 66h-48v88h48" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
                <path d="M36 26h348M36 194h348" stroke="#ffffff" strokeWidth="2" opacity="0.55" />
                <path d="M36 208h348" stroke="#244c3b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10" aria-label="Search and filters">
        <form method="get" className="surface-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label htmlFor="venue-search">Search {category === "hall" ? "halls" : "grounds"}</Label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input
                  id="venue-search"
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder={category === "hall" ? "Name, city or keyword" : "Name, city or sport"}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full lg:w-44">
              <Label htmlFor="city">Location</Label>
              <Select
                id="city"
                name="city"
                defaultValue={filters.city ?? ""}
                placeholder="All cities"
                className="mt-1.5"
                options={[
                  { value: "", label: "All cities" },
                  ...facets.cities.map((city) => ({
                    value: city.value,
                    label: `${city.value} (${city.count})`,
                  })),
                ]}
              />
            </div>
            {category === "hall" ? (
              <div className="w-full lg:w-40">
                <Label htmlFor="capacity">Minimum capacity</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  defaultValue={num(searchParams.capacity) ?? ""}
                  placeholder={facets.maxCapacity ? `Up to ${facets.maxCapacity}` : "Any"}
                  className="mt-1.5"
                />
              </div>
            ) : (
              <div className="w-full lg:w-44">
                <Label htmlFor="sport">Sport</Label>
                <Select
                  id="sport"
                  name="sport"
                  defaultValue={filters.sport ?? ""}
                  placeholder="All sports"
                  className="mt-1.5"
                  options={[
                    { value: "", label: "All sports" },
                    ...facets.sports.map((sport) => ({
                      value: sport.value,
                      label: `${sport.value} (${sport.count})`,
                    })),
                  ]}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 lg:flex-none">
                <Filter className="h-4 w-4" aria-hidden="true" />
                Apply
              </Button>
              {activeFilters > 0 ? (
                <ButtonLink href={`/${category === "hall" ? "halls" : "grounds"}`} variant="ghost" size="md">
                  <X className="h-4 w-4" aria-hidden="true" />
                  Reset
                </ButtonLink>
              ) : null}
            </div>
          </div>

          <details className="group mt-4 border-t border-border pt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-foreground-soft">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              More filters
              <span className="ml-auto text-[0.65rem] font-normal text-muted group-open:hidden">
                {activeFilters > 0 ? `${activeFilters} active` : "Price, facilities, sorting"}
              </span>
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="minPrice">Minimum price (₹)</Label>
                <Input
                  id="minPrice"
                  name="minPrice"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={num(searchParams.minPrice) ?? ""}
                  placeholder={facets.minPricePaise ? String(Math.floor(facets.minPricePaise / 100)) : "No minimum"}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="maxPrice">Maximum price (₹)</Label>
                <Input
                  id="maxPrice"
                  name="maxPrice"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={num(searchParams.maxPrice) ?? ""}
                  placeholder={facets.maxPricePaise ? String(Math.ceil(facets.maxPricePaise / 100)) : "No maximum"}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="amenity">Facility</Label>
                <Select
                  id="amenity"
                  name="amenity"
                  defaultValue={filters.amenity ?? ""}
                  placeholder="Any facility"
                  className="mt-1.5"
                  options={[
                    { value: "", label: "Any facility" },
                    ...facets.amenities.map((amenity) => ({
                      value: amenity.value,
                      label: `${amenity.value} (${amenity.count})`,
                    })),
                  ]}
                />
              </div>
              {category === "ground" ? (
                <div>
                  <Label htmlFor="surface">Surface</Label>
                  <Select
                    id="surface"
                    name="surface"
                    defaultValue={filters.surface ?? ""}
                    placeholder="Any surface"
                    className="mt-1.5"
                    options={[
                      { value: "", label: "Any surface" },
                      ...facets.surfaces.map((surface) => ({
                        value: surface.value,
                        label: `${surface.value} (${surface.count})`,
                      })),
                    ]}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="sort">{sortLabel}</Label>
                  <Select
                    id="sort"
                    name="sort"
                    defaultValue={filters.sort ?? "newest"}
                    className="mt-1.5"
                    options={sortOptions}
                  />
                </div>
              )}
              {category === "ground" ? (
                <div>
                  <Label htmlFor="sort">{sortLabel}</Label>
                  <Select
                    id="sort"
                    name="sort"
                    defaultValue={filters.sort ?? "newest"}
                    className="mt-1.5"
                    options={sortOptions}
                  />
                </div>
              ) : null}
            </div>
          </details>
        </form>
      </section>

      <section className="container-page pb-12" aria-live="polite">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {result.total === 0
              ? "No results"
              : `${formatNumber(result.total)} ${result.total === 1 ? "venue" : "venues"} found`}
            {activeFilters > 0 ? " with these filters" : ""}
          </p>
          {activeFilters > 0 ? (
            <p className="text-xs text-muted">
              Filters are applied to approved, published venues only.
            </p>
          ) : null}
        </div>

        {result.items.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((venue, index) => (
                <VenueCard key={venue.id} venue={venue} priority={index === 0} />
              ))}
            </div>
            <div className="mt-7">
              <Pagination
                basePath={`/${category === "hall" ? "halls" : "grounds"}`}
                page={result.page}
                pageSize={result.pageSize}
                total={result.total}
                searchParams={queryWithoutPage}
              />
            </div>
          </>
        ) : activeFilters > 0 ? (
          <EmptyState
            variant="search"
            title="No venues match these filters."
            description="Try a wider price range, another city, or fewer facilities. Only approved venues appear in search."
            action={
              <ButtonLink href={`/${category === "hall" ? "halls" : "grounds"}`} variant="secondary">
                Clear all filters
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            variant={category}
            title={meta.emptyTitle}
            description={meta.emptyDescription}
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <ButtonLink href="/list-your-venue">List a venue</ButtonLink>
                <ButtonLink href="/how-it-works" variant="secondary">
                  See how it works
                </ButtonLink>
              </div>
            }
          />
        )}
      </section>

      <section className="border-t border-border bg-surface/50 py-8">
        <div className="container-page flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            Only real, admin-approved venues are shown. No stock listings.
          </p>
          <Link href="/list-your-venue" className="text-sm font-semibold text-primary underline underline-offset-4">
            Own a venue? Start a listing
          </Link>
        </div>
      </section>
    </div>
  );
}
