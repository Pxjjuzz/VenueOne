import "server-only";

import { dbQuery } from "@/lib/db";
import { computeTotals } from "@/lib/policies";
import type { PricingSlot, VenueCategory, VenuePricingRow } from "@/lib/types";
import { addDaysToDateKey, istDateTime } from "@/lib/time";
import { resolveDayHours, buildHourGrid, type DayHours, type Interval } from "./slots";
import { resolveBookingSelection } from "./selection";

export type BookingQuote =
  | {
      ok: true;
      venueId: string;
      date: string;
      slotType: "half_day_morning" | "half_day_afternoon" | "full_day" | "hourly";
      startsAt: string;
      endsAt: string;
      hours: number;
      unitPricePaise: number;
      subtotalPaise: number;
      feePaise: number;
      taxPaise: number;
      taxPercent: number;
      totalPaise: number;
      currency: string;
      bookingPolicy: "instant" | "approval";
      paymentWindowMinutes: number;
    }
  | {
      ok: false;
      code: "not_found" | "invalid" | "unavailable" | "inactive";
      error: string;
    };

export async function quoteBooking(input: {
  venueId: string;
  date: string;
  slotType: string;
  startTime?: string;
  hours?: number;
  guestCount?: number;
  now?: Date;
}): Promise<BookingQuote> {
  const now = input.now ?? new Date();

  const venues = await dbQuery<{
    id: string;
    category: VenueCategory;
    capacity: number | null;
    booking_policy: "instant" | "approval";
    payment_window_minutes: number;
    accepting_bookings: boolean;
    status: string;
  }>(
    `select id, category, capacity, booking_policy, payment_window_minutes,
            accepting_bookings, status
     from venues where id = $1 and status = 'approved'`,
    [input.venueId],
  );
  const venue = venues[0];
  if (!venue) {
    return { ok: false, code: "not_found", error: "This venue is not available for booking." };
  }
  if (!venue.accepting_bookings) {
    return { ok: false, code: "inactive", error: "This venue is not accepting bookings right now." };
  }

  const dayStart = istDateTime(input.date, "00:00");
  const dayEnd = addDaysToDateKey(input.date, 1);

  const [hourRows, pricingRows, blockRows, bookedRows, settingsRows] = await Promise.all([
    dbQuery<{ weekday: number; opens_at: string; closes_at: string; is_closed: boolean }>(
      `select weekday, to_char(opens_at, 'HH24:MI') as opens_at,
              to_char(closes_at, 'HH24:MI') as closes_at, is_closed
       from venue_hours where venue_id = $1`,
      [input.venueId],
    ),
    dbQuery<VenuePricingRow>("select * from venue_pricing where venue_id = $1", [input.venueId]),
    dbQuery<{ starts_at: Date; ends_at: Date }>(
      `select starts_at, ends_at from venue_blocks
       where venue_id = $1 and starts_at < $2 and ends_at > $3`,
      [input.venueId, dayEnd, dayStart],
    ),
    dbQuery<{ slot_start: Date; slot_end: Date }>(
      `select slot_start, slot_end from booking_slots
       where venue_id = $1 and slot_start >= $2 and slot_start < $3`,
      [input.venueId, dayStart, dayEnd],
    ),
    dbQuery<{ key: string; value: unknown }>("select key, value from platform_settings"),
  ]);

  const dayHours: DayHours[] = hourRows.map((row) => ({
    weekday: row.weekday,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    isClosed: row.is_closed,
  }));
  const resolvedDay = resolveDayHours(dayHours, input.date);
  if (!resolvedDay) {
    return { ok: false, code: "unavailable", error: "The venue is closed on that date." };
  }
  const grid = buildHourGrid(input.date, resolvedDay);
  if (grid.length === 0) {
    return {
      ok: false,
      code: "unavailable",
      error: "The venue has no operating hours on that date.",
    };
  }

  const pricing = new Map<PricingSlot, number>();
  for (const row of pricingRows) {
    if (row.amount_paise != null) pricing.set(row.slot, row.amount_paise);
  }

  const blocks: Interval[] = blockRows.map((row) => ({
    start: new Date(row.starts_at),
    end: new Date(row.ends_at),
  }));
  const booked: Interval[] = bookedRows.map((row) => ({
    start: new Date(row.slot_start),
    end: new Date(row.slot_end),
  }));

  const selection = resolveBookingSelection({
    category: venue.category,
    capacity: venue.capacity,
    date: input.date,
    slotType: input.slotType,
    startTime: input.startTime,
    hours: input.hours,
    guestCount: input.guestCount,
    now,
    dayHours: resolvedDay,
    pricing,
    blocks,
    booked,
  });
  if (!selection.ok) {
    return { ok: false, code: selection.code, error: selection.error };
  }

  const settings = new Map(settingsRows.map((row) => [row.key, row.value]));
  const numberSetting = (key: string, fallback: number) => {
    const raw = settings.get(key);
    const parsed = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const feePaise = Math.max(0, numberSetting("platform_fee_paise", 0));
  const taxPercent = Math.min(28, Math.max(0, numberSetting("tax_percent", 0)));
  const totals = computeTotals({
    subtotalPaise: selection.subtotalPaise,
    platformFeePaise: feePaise,
    taxPercent,
  });

  return {
    ok: true,
    venueId: venue.id,
    date: input.date,
    slotType: selection.slotType,
    startsAt: selection.interval.start.toISOString(),
    endsAt: selection.interval.end.toISOString(),
    hours: selection.bookedHours,
    unitPricePaise: selection.unitPricePaise,
    subtotalPaise: totals.subtotalPaise,
    feePaise: totals.feePaise,
    taxPaise: totals.taxPaise,
    taxPercent,
    totalPaise: totals.totalPaise,
    currency: "INR",
    bookingPolicy: venue.booking_policy,
    paymentWindowMinutes: venue.payment_window_minutes,
  };
}
