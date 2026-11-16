import { describe, expect, it } from "vitest";

import {
  isVenueId,
  isVenueSlug,
  parseMonthQuery,
  parseVenueListQuery,
} from "@/lib/api/catalog-params";

describe("parseVenueListQuery", () => {
  it("accepts a category on its own", () => {
    const parsed = parseVenueListQuery({ category: "ground" });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.category).toBe("ground");
      expect(parsed.value.page).toBeUndefined();
    }
  });

  it("converts numeric strings and keeps filters", () => {
    const parsed = parseVenueListQuery({
      category: "hall",
      city: " Anekal ",
      minPricePaise: "2000000",
      maxPricePaise: "4500000",
      minCapacity: "200",
      page: "2",
      pageSize: "12",
      sort: "price_asc",
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.city).toBe("Anekal");
      expect(parsed.value.minPricePaise).toBe(2_000_000);
      expect(parsed.value.maxPricePaise).toBe(4_500_000);
      expect(parsed.value.minCapacity).toBe(200);
      expect(parsed.value.page).toBe(2);
      expect(parsed.value.sort).toBe("price_asc");
    }
  });

  it("rejects a missing or unknown category", () => {
    expect(parseVenueListQuery({}).ok).toBe(false);
    const parsed = parseVenueListQuery({ category: "stadium" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toContain("category");
  });

  it("rejects a page below one and a page size above the cap", () => {
    expect(parseVenueListQuery({ category: "hall", page: "0" }).ok).toBe(false);
    expect(parseVenueListQuery({ category: "hall", pageSize: "50" }).ok).toBe(false);
  });

  it("rejects an inverted price range", () => {
    const parsed = parseVenueListQuery({
      category: "hall",
      minPricePaise: "5000000",
      maxPricePaise: "1000000",
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toContain("minPricePaise");
  });

  it("rejects a non-numeric price", () => {
    expect(parseVenueListQuery({ category: "hall", minPricePaise: "cheap" }).ok).toBe(false);
  });
});

describe("parseMonthQuery", () => {
  it("accepts a valid month", () => {
    const parsed = parseMonthQuery({ month: "2026-12" });
    expect(parsed.ok).toBe(true);
  });

  it("rejects a malformed or out of range month", () => {
    expect(parseMonthQuery({}).ok).toBe(false);
    expect(parseMonthQuery({ month: "2026-13" }).ok).toBe(false);
    expect(parseMonthQuery({ month: "December" }).ok).toBe(false);
  });
});

describe("identifier checks", () => {
  it("accepts lowercase slugs and rejects paths", () => {
    expect(isVenueSlug("sowbhagya-kalyana-mantapa")).toBe(true);
    expect(isVenueSlug("../admin")).toBe(false);
    expect(isVenueSlug("Hall One")).toBe(false);
  });

  it("accepts only UUID venue ids", () => {
    expect(isVenueId("26654d0f-4b87-4331-8880-26535ddb160f")).toBe(true);
    expect(isVenueId("venue-1")).toBe(false);
  });
});
