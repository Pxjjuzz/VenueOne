import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildMonthAvailability } from "@/lib/booking/availability";
import type { PricingSlot, VenuePricingRow } from "@/lib/types";

function price(slot: PricingSlot, amount: number | null): VenuePricingRow {
  return {
    venue_id: "venue-1",
    slot,
    amount_paise: amount,
    proposed_amount_paise: null,
    proposed_at: null,
    approved_by: null,
    approved_at: null,
  };
}

const saturday = { weekday: 6, opensAt: "09:00", closesAt: "17:00", isClosed: false };
const closedWeekdays = [0, 1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  opensAt: "09:00",
  closesAt: "17:00",
  isClosed: true,
}));

function build(category: "hall" | "ground", pricing: VenuePricingRow[]) {
  return buildMonthAvailability({
    venueId: "venue-1",
    month: "2026-11",
    category,
    hours: [...closedWeekdays, saturday],
    pricing,
    blocks: [],
    booked: [],
    now: new Date("2026-11-10T00:00:00+05:30"),
  });
}

function day(availability: ReturnType<typeof build>, date: string) {
  const found = availability.days.find((entry) => entry.date === date);
  if (!found) throw new Error(`Missing day ${date}`);
  return found;
}

describe("buildMonthAvailability", () => {
  it("offers fixed half-day and full-day slots for a hall", () => {
    const availability = build("hall", [price("half_day", 600_000), price("full_day", 1_000_000)]);
    const slots = day(availability, "2026-11-14").slots;

    expect(slots.map((slot) => slot.slotType)).toEqual([
      "half_day_morning",
      "half_day_afternoon",
      "full_day",
    ]);
    expect(slots.every((slot) => slot.available)).toBe(true);
    expect(slots[0].pricePaise).toBe(600_000);
    expect(slots[2].pricePaise).toBe(1_000_000);
  });

  it("offers hourly slots for a ground with the same opening hours", () => {
    const availability = build("ground", [price("hour", 150_000)]);
    const slots = day(availability, "2026-11-14").slots;

    expect(slots).toHaveLength(8);
    expect(slots.every((slot) => slot.slotType === "hourly")).toBe(true);
    expect(slots[0].startTime).toBe("09:00");
    expect(slots[7].startTime).toBe("16:00");
    expect(slots.every((slot) => slot.available && slot.pricePaise === 150_000)).toBe(true);
  });

  it("keeps hourly offers unavailable until the hourly price is approved", () => {
    const availability = build("ground", [price("half_day", 600_000)]);
    const slots = day(availability, "2026-11-14").slots;

    expect(slots.every((slot) => slot.slotType === "hourly")).toBe(true);
    expect(slots.every((slot) => !slot.available)).toBe(true);
    expect(slots[0].reason).toBe("Pricing is pending approval.");
  });
});
