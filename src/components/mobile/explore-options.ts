export const EXPLORE_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "capacity_desc", label: "Capacity: high to low" },
] as const;

export const EXPLORE_PRICE_CAPS = [
  { value: "", label: "Any price" },
  { value: "2500000", label: "Under ₹25,000" },
  { value: "5000000", label: "Under ₹50,000" },
  { value: "10000000", label: "Under ₹1,00,000" },
] as const;

export type ExploreSort = (typeof EXPLORE_SORTS)[number]["value"];

export type ExploreBase = {
  category: "hall" | "ground";
  q?: string;
  city?: string;
  sort?: ExploreSort;
  maxPricePaise?: string;
};

export function buildExploreHref(
  base: ExploreBase,
  overrides: Partial<ExploreBase & { page?: string }> = {},
): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/app?${query}` : "/app";
}
