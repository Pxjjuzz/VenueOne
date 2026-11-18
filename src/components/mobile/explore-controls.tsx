"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronDown, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/cn";
import {
  EXPLORE_PRICE_CAPS,
  EXPLORE_SORTS,
  buildExploreHref,
  type ExploreBase,
  type ExploreSort,
} from "./explore-options";

type CityFacet = { value: string; count: number };

function ChipRadio({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="flex h-10 items-center justify-center rounded-full border border-border bg-surface px-3.5 text-[0.82rem] font-medium text-foreground-soft transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:font-semibold peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]">
        {label}
      </span>
    </label>
  );
}

export function ExploreControls({
  base,
  q,
  city,
  sort,
  maxPricePaise,
  filterCount,
  cities,
}: {
  base: ExploreBase;
  q?: string;
  city?: string;
  sort: ExploreSort;
  maxPricePaise?: string;
  filterCount: number;
  cities: CityFacet[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sortLabel = EXPLORE_SORTS.find((item) => item.value === sort)?.label ?? "Newest";

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value);
    }
    const query = params.toString();
    setOpen(false);
    router.push(query ? `/app?${query}` : "/app");
  }

  return (
    <>
      <div className="px-5 pt-[calc(0.85rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <BrandMark href="/app" />

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={filterCount > 0 ? `Filters, ${filterCount} applied` : "Filters"}
            className="relative grid h-11 w-11 place-items-center rounded-full bg-surface text-foreground shadow-[var(--shadow-sm)] transition-transform active:scale-95"
          >
            <SlidersHorizontal className="h-4.5 w-4.5" aria-hidden="true" />
            {filterCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-white">
                {filterCount}
              </span>
            ) : null}
          </button>
        </div>

        <h1 className="mt-6 text-[2rem] font-semibold leading-none tracking-[-0.045em] text-foreground">
          Explore
        </h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-[0.84rem] font-medium text-muted transition-colors active:text-foreground"
        >
          <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {city ?? "All cities"}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <form action="/app" method="get" role="search" className="relative mt-4">
          <input type="hidden" name="category" value={base.category} />
          {base.city ? <input type="hidden" name="city" value={base.city} /> : null}
          {base.sort ? <input type="hidden" name="sort" value={base.sort} /> : null}
          {base.maxPricePaise ? (
            <input type="hidden" name="maxPricePaise" value={base.maxPricePaise} />
          ) : null}
          <label htmlFor="app-search" className="sr-only">
            Search by venue or city
          </label>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            id="app-search"
            name="q"
            type="search"
            enterKeyHint="search"
            defaultValue={q ?? ""}
            placeholder="Search venue or city"
            className="h-12 w-full rounded-full bg-surface pl-11 pr-20 text-[0.9rem] text-foreground shadow-[var(--shadow-sm)] placeholder:text-muted/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          />
          {q ? (
            <Link
              href={buildExploreHref(base, { q: undefined })}
              aria-label="Clear search"
              className="absolute right-11 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-primary text-white transition-transform active:scale-95"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        <div className="no-scrollbar -mx-5 mt-4 flex items-center gap-2 overflow-x-auto px-5 pb-1">
          {(
            [
              { value: "hall", label: "Halls" },
              { value: "ground", label: "Grounds" },
            ] as const
          ).map((tab) => {
            const active = base.category === tab.value;
            return (
              <Link
                key={tab.value}
                href={buildExploreHref({ ...base, category: tab.value })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 shrink-0 items-center rounded-full px-4 text-[0.84rem] font-semibold transition-colors",
                  active
                    ? "bg-foreground text-white"
                    : "bg-surface text-foreground-soft shadow-[var(--shadow-sm)]",
                )}
              >
                {tab.label}
              </Link>
            );
          })}

          <span className="h-6 w-px shrink-0 bg-border" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[0.8rem] font-medium text-foreground-soft shadow-[var(--shadow-sm)]"
          >
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            {sortLabel}
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="app-fade-in fixed inset-0 z-50 bg-[rgba(10,14,11,0.45)]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-title"
            className="app-sheet-in fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-background"
          >
            <div className="shrink-0 px-5 pb-1 pt-3">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-border-strong" aria-hidden="true" />
              <div className="mt-3 flex items-center justify-between">
                <h2 id="filter-title" className="text-[1.15rem] font-semibold tracking-[-0.02em]">
                  Filters
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="grid h-9 w-9 place-items-center rounded-full bg-surface-secondary text-foreground-soft"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <form
              action="/app"
              method="get"
              onSubmit={applyFilters}
              className="flex min-h-0 flex-1 flex-col"
            >
              <input type="hidden" name="category" value={base.category} />
              {q ? <input type="hidden" name="q" value={q} /> : null}

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3">
                <section aria-labelledby="filter-city-label">
                  <p
                    id="filter-city-label"
                    className="mb-2 text-[0.72rem] font-semibold text-foreground"
                  >
                    City
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <ChipRadio name="city" value="" label="Any city" defaultChecked={!city} />
                    {cities.map((option) => (
                      <ChipRadio
                        key={option.value}
                        name="city"
                        value={option.value}
                        label={`${option.value} (${option.count})`}
                        defaultChecked={city === option.value}
                      />
                    ))}
                  </div>
                </section>

                <section className="mt-5" aria-labelledby="filter-price-label">
                  <p
                    id="filter-price-label"
                    className="mb-2 text-[0.72rem] font-semibold text-foreground"
                  >
                    Price
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPLORE_PRICE_CAPS.map((option) => (
                      <ChipRadio
                        key={option.value || "any"}
                        name="maxPricePaise"
                        value={option.value}
                        label={option.label}
                        defaultChecked={(maxPricePaise ?? "") === option.value}
                      />
                    ))}
                  </div>
                </section>

                <section className="mt-5" aria-labelledby="filter-sort-label">
                  <p
                    id="filter-sort-label"
                    className="mb-2 text-[0.72rem] font-semibold text-foreground"
                  >
                    Sort by
                  </p>
                  <div className="grid gap-2">
                    {EXPLORE_SORTS.map((option) => (
                      <ChipRadio
                        key={option.value}
                        name="sort"
                        value={option.value}
                        label={option.label}
                        defaultChecked={sort === option.value}
                      />
                    ))}
                  </div>
                </section>
              </div>

              <div className="shrink-0 border-t border-border bg-surface px-5 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/app?category=${base.category}`}
                    onClick={() => setOpen(false)}
                    className="grid h-12 shrink-0 place-items-center rounded-full border border-border-strong px-5 text-[0.86rem] font-semibold text-foreground-soft"
                  >
                    Reset
                  </Link>
                  <button
                    type="submit"
                    className="h-12 flex-1 rounded-full bg-primary text-[0.9rem] font-semibold text-white shadow-[var(--shadow-md)] transition-transform active:scale-[0.99]"
                  >
                    Show results
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}
