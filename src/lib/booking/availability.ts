import "server-only";

import { dbQuery } from "@/lib/db";
import { datesInMonth, formatTimeRange, istDateKey, monthRange } from "@/lib/time";
import { formatMoney } from "@/lib/format";
import type { PricingSlot, VenueCategory, VenuePricingRow } from "@/lib/types";
import {
  buildHallGrid,
  buildHourGrid,
  hallSlotPrice,
  isPastInterval,
  resolveDayHours,
  slotIsFree,
  type DayHours,
  type Interval,
} from "./slots";

export type AvailabilityOffer = {
  key: string;
  slotType: "half_day_morning" | "half_day_afternoon" | "full_day" | "hourly";
  label: string;
  start: string;
  end: string;
  startTime?: string;
  pricePaise: number | null;
  priceLabel: string;
  available: boolean;
  reason?: string;
};

export type DayAvailability = {
  date: string;
  closed: boolean;
  past: boolean;
  slots: AvailabilityOffer[];
};

export type MonthAvailability = {
  venueId: string;
  month: string;
  timezone: "Asia/Kolkata";
  generatedAt: string;
  minPricePaise: number | null;
  days: DayAvailability[];
};

type SlotRow = { slot_start: Date; slot_end: Date };

export async function loadMonthAvailability(
  venueId: string,
  month: string,
  category: VenueCategory,
  now = new Date(),
): Promise<MonthAvailability> {
  await dbQuery("select refresh_booking_states()");
  const { start, end } = monthRange(month);

  const [hourRows, pricing, blocks, booked] = await Promise.all([
    dbQuery<{ venue_id: string; weekday: number; opens_at: string; closes_at: string; is_closed: boolean }>(
      `select venue_id, weekday, to_char(opens_at, 'HH24:MI') as opens_at,
              to_char(closes_at, 'HH24:MI') as closes_at, is_closed
       from venue_hours where venue_id = $1 order by weekday`,
      [venueId],
    ),
    dbQuery<VenuePricingRow>(
      "select * from venue_pricing where venue_id = $1",
      [venueId],
    ),
    dbQuery<{ starts_at: Date; ends_at: Date }>(
      `select starts_at, ends_at from venue_blocks
       where venue_id = $1 and starts_at < $2 and ends_at > $3`,
      [venueId, end, start],
    ),
    dbQuery<SlotRow>(
      `select slot_start, slot_end from booking_slots
       where venue_id = $1 and slot_start >= $2 and slot_start < $3`,
      [venueId, start, end],
    ),
  ]);

  return buildMonthAvailability({
    venueId,
    month,
    category,
    hours: hourRows.map((row) => ({
      weekday: row.weekday,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
      isClosed: row.is_closed,
    })),
    pricing,
    blocks: blocks.map((row) => ({ start: new Date(row.starts_at), end: new Date(row.ends_at) })),
    booked: booked.map((row) => ({ start: new Date(row.slot_start), end: new Date(row.slot_end) })),
    now,
  });
}

export function buildMonthAvailability(input: {
  venueId: string;
  month: string;
  category: VenueCategory;
  hours: DayHours[];
  pricing: VenuePricingRow[];
  blocks: Interval[];
  booked: Interval[];
  now: Date;
}): MonthAvailability {
  const today = istDateKey(input.now);

  const pricingMap = new Map<PricingSlot, number>();
  for (const row of input.pricing) {
    if (row.amount_paise != null) pricingMap.set(row.slot, row.amount_paise);
  }

  const days = datesInMonth(input.month).map<DayAvailability>((date) => {
    if (date < today) {
      return { date, closed: false, past: true, slots: [] };
    }

    const dayHours = resolveDayHours(input.hours, date);
    if (!dayHours) {
      return { date, closed: true, past: false, slots: [] };
    }

    const grid = buildHourGrid(date, dayHours);
    if (grid.length === 0) {
      return { date, closed: true, past: false, slots: [] };
    }

    const free = grid.map(
      (slot) =>
        !isPastInterval(slot, input.now) &&
        slotIsFree(slot, input.booked, input.blocks),
    );

    if (input.pricing.length === 0) {
      return { date, closed: false, past: false, slots: [] };
    }

    if (input.category === "hall") {
      // A hall has three fixed offers. The grid is used only to detect partial
      // conflicts, so bookings remain aligned to half-day boundaries.
      const hallGrid = buildHallGrid(date, dayHours);
      if (!hallGrid) {
        return { date, closed: false, past: false, slots: [] };
      }

      const offers: AvailabilityOffer[] = [];
      const definitions = [
        {
          slotType: "half_day_morning" as const,
          interval: hallGrid.morning,
          label: "Morning",
          price: hallSlotPrice(pricingMap, "half_day_morning"),
        },
        {
          slotType: "half_day_afternoon" as const,
          interval: hallGrid.afternoon,
          label: "Afternoon",
          price: hallSlotPrice(pricingMap, "half_day_afternoon"),
        },
        {
          slotType: "full_day" as const,
          interval: hallGrid.full,
          label: "Full day",
          price: hallSlotPrice(pricingMap, "full_day"),
        },
      ];

      for (const definition of definitions) {
        const available =
          !isPastInterval(definition.interval, input.now) &&
          slotIsFree(definition.interval, input.booked, input.blocks) &&
          definition.price != null;
        offers.push({
          key: `${definition.slotType}:${date}`,
          slotType: definition.slotType,
          label: `${definition.label} · ${formatTimeRange(
            definition.interval.start,
            definition.interval.end,
          )}`,
          start: definition.interval.start.toISOString(),
          end: definition.interval.end.toISOString(),
          pricePaise: definition.price,
          priceLabel: formatMoney(definition.price),
          available,
          reason: available
            ? undefined
            : definition.price == null
              ? "Pricing is pending approval."
              : "This period is not available.",
        });
      }
      return { date, closed: false, past: false, slots: offers };
    }

    const hourlyPrice = pricingMap.get("hour") ?? null;
    const offers = grid.map<AvailabilityOffer>((slot, index) => ({
      key: `hourly:${slot.start.toISOString()}`,
      slotType: "hourly",
      label: slot.label,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      startTime: slot.time,
      pricePaise: hourlyPrice,
      priceLabel: formatMoney(hourlyPrice),
      available: free[index] && hourlyPrice != null,
      reason: hourlyPrice == null ? "Pricing is pending approval." : undefined,
    }));

    return { date, closed: false, past: false, slots: offers };
  });

  const approvedPrices = input.pricing
    .map((row) => row.amount_paise)
    .filter((value): value is number => value != null);

  return {
    venueId: input.venueId,
    month: input.month,
    timezone: "Asia/Kolkata",
    generatedAt: input.now.toISOString(),
    minPricePaise: approvedPrices.length ? Math.min(...approvedPrices) : null,
    days,
  };
}
