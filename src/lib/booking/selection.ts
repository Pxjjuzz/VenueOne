import type {
  BookingSlotType,
  PricingSlot,
  VenueCategory,
} from "@/lib/types";
import {
  buildHallGrid,
  buildHourGrid,
  hallSlotPrice,
  hourlyBookingInterval,
  hourlyPrice,
  intervalsForHallSlot,
  slotIsFree,
  type DayHours,
  type Interval,
} from "./slots";

export type BookingSelectionContext = {
  category: VenueCategory;
  capacity: number | null;
  date: string;
  slotType: string;
  startTime?: string;
  hours?: number;
  guestCount?: number;
  now: Date;
  dayHours: DayHours;
  pricing: Map<PricingSlot, number>;
  blocks: Interval[];
  booked: Interval[];
};

export type BookingSelectionResult =
  | {
      ok: true;
      interval: Interval;
      slotType: BookingSlotType;
      unitPricePaise: number;
      subtotalPaise: number;
      bookedHours: number;
    }
  | {
      ok: false;
      code: "invalid" | "unavailable";
      error: string;
    };

export function resolveBookingSelection(
  context: BookingSelectionContext,
): BookingSelectionResult {
  const grid = buildHourGrid(context.date, context.dayHours);
  if (grid.length === 0) {
    return {
      ok: false,
      code: "unavailable",
      error: "The venue has no operating hours on that date.",
    };
  }

  let interval: Interval | null = null;
  let slotType: BookingSlotType;
  let unitPricePaise: number | null = null;
  let subtotalPaise: number | null = null;
  let bookedHours = 1;

  if (context.category === "hall") {
    if (
      context.slotType !== "half_day_morning" &&
      context.slotType !== "half_day_afternoon" &&
      context.slotType !== "full_day"
    ) {
      return { ok: false, code: "invalid", error: "Choose a half-day or full-day booking." };
    }
    const hallGrid = buildHallGrid(context.date, context.dayHours);
    if (!hallGrid) {
      return {
        ok: false,
        code: "unavailable",
        error: "This venue's operating hours cannot produce hall slots.",
      };
    }
    interval = intervalsForHallSlot(context.slotType, hallGrid);
    if (!interval) {
      return { ok: false, code: "invalid", error: "Choose a valid hall slot." };
    }
    unitPricePaise = hallSlotPrice(context.pricing, context.slotType);
    subtotalPaise = unitPricePaise;
    slotType = context.slotType;
    bookedHours = Math.round(
      (interval.end.getTime() - interval.start.getTime()) / 3_600_000,
    );
  } else {
    if (context.slotType !== "hourly" || !context.startTime || !context.hours) {
      return { ok: false, code: "invalid", error: "Choose a start time and duration." };
    }
    const hourly = hourlyBookingInterval({
      dateKey: context.date,
      grid,
      startTime: context.startTime,
      hours: context.hours,
    });
    if (!hourly) {
      return { ok: false, code: "invalid", error: "Choose a valid hourly block." };
    }
    interval = hourly.interval;
    unitPricePaise = context.pricing.get("hour") ?? null;
    subtotalPaise = hourlyPrice(context.pricing, hourly.hours);
    slotType = "hourly";
    bookedHours = hourly.hours;
  }

  if (subtotalPaise == null || unitPricePaise == null) {
    return {
      ok: false,
      code: "unavailable",
      error: "Pricing is not available for this slot.",
    };
  }
  if (interval.start.getTime() <= context.now.getTime()) {
    return { ok: false, code: "invalid", error: "Choose a future time." };
  }
  if (!slotIsFree(interval, context.booked, context.blocks)) {
    return { ok: false, code: "unavailable", error: "That slot is no longer available." };
  }
  if (
    context.capacity != null &&
    context.guestCount != null &&
    context.guestCount > context.capacity
  ) {
    return {
      ok: false,
      code: "invalid",
      error: `This venue holds up to ${context.capacity} guests.`,
    };
  }

  return {
    ok: true,
    interval,
    slotType,
    unitPricePaise,
    subtotalPaise,
    bookedHours,
  };
}
