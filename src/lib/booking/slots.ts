import {
  addDaysToDateKey,
  formatTimeRange,
  istDateKey,
  istDateTime,
  parseTimeToMinutes,
  weekdayOf,
} from "@/lib/time";
import type { PricingSlot } from "@/lib/types";

export type DayHours = {
  weekday: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

export type Interval = { start: Date; end: Date };

export type HourGrid = Interval & { time: string; label: string };

export type HallGrid = {
  morning: Interval;
  afternoon: Interval;
  full: Interval;
};

export function isValidDayHours(hours: DayHours): boolean {
  if (hours.isClosed) return false;
  const opens = parseTimeToMinutes(hours.opensAt);
  const closes = parseTimeToMinutes(hours.closesAt);
  return (
    opens % 60 === 0 &&
    closes % 60 === 0 &&
    opens >= 0 &&
    closes <= 24 * 60 &&
    closes > opens
  );
}

export function resolveDayHours(
  hoursByWeekday: DayHours[],
  dateKey: string,
): DayHours | null {
  const weekday = weekdayOf(dateKey);
  const hours = hoursByWeekday.find((day) => day.weekday === weekday);
  if (!hours || !isValidDayHours(hours)) return null;
  return hours;
}

export function buildHourGrid(dateKey: string, hours: DayHours): HourGrid[] {
  if (!isValidDayHours(hours)) return [];
  const opens = parseTimeToMinutes(hours.opensAt);
  const closes = parseTimeToMinutes(hours.closesAt);
  const slots: HourGrid[] = [];

  for (let minutes = opens; minutes + 60 <= closes; minutes += 60) {
    const startTime = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:00`;
    const endTime = `${String(Math.floor((minutes + 60) / 60)).padStart(2, "0")}:00`;
    const start = istDateTime(dateKey, startTime);
    const end = istDateTime(dateKey, endTime);
    slots.push({
      start,
      end,
      time: startTime,
      label: formatTimeRange(start, end),
    });
  }

  return slots;
}

export function buildHallGrid(dateKey: string, hours: DayHours): HallGrid | null {
  if (!isValidDayHours(hours)) return null;
  const opens = parseTimeToMinutes(hours.opensAt);
  const closes = parseTimeToMinutes(hours.closesAt);
  const totalHours = (closes - opens) / 60;
  if (totalHours < 2) return null;

  const midpoint = opens + Math.floor(totalHours / 2) * 60;
  const midpointTime = `${String(Math.floor(midpoint / 60)).padStart(2, "0")}:00`;

  return {
    morning: {
      start: istDateTime(dateKey, hours.opensAt),
      end: istDateTime(dateKey, midpointTime),
    },
    afternoon: {
      start: istDateTime(dateKey, midpointTime),
      end: istDateTime(dateKey, hours.closesAt),
    },
    full: {
      start: istDateTime(dateKey, hours.opensAt),
      end: istDateTime(dateKey, hours.closesAt),
    },
  };
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

export function isPastInterval(interval: Interval, now = new Date()): boolean {
  return interval.end.getTime() <= now.getTime();
}

export function slotIsFree(
  interval: Interval,
  booked: Interval[],
  blocks: Interval[],
): boolean {
  return (
    !booked.some((entry) => overlaps(interval, entry)) &&
    !blocks.some((entry) => overlaps(interval, entry))
  );
}

export function intervalsForHallSlot(slotType: string, grid: HallGrid): Interval | null {
  switch (slotType) {
    case "half_day_morning":
      return grid.morning;
    case "half_day_afternoon":
      return grid.afternoon;
    case "full_day":
      return grid.full;
    default:
      return null;
  }
}

export function hallSlotPrice(
  pricing: Map<PricingSlot, number>,
  slotType: string,
): number | null {
  if (slotType === "full_day") return pricing.get("full_day") ?? null;
  if (slotType === "half_day_morning" || slotType === "half_day_afternoon") {
    return pricing.get("half_day") ?? null;
  }
  return null;
}

export function hourlyPrice(
  pricing: Map<PricingSlot, number>,
  hours: number,
): number | null {
  const hourly = pricing.get("hour");
  return hourly == null ? null : hourly * hours;
}

export function hourlyBookingInterval(input: {
  dateKey: string;
  grid: HourGrid[];
  startTime: string;
  hours: number;
}): { interval: Interval; hours: number } | null {
  const startIndex = input.grid.findIndex((slot) => slot.time === input.startTime);
  if (startIndex < 0) return null;
  if (input.hours < 1) return null;
  const endIndex = startIndex + input.hours - 1;
  if (endIndex >= input.grid.length) return null;

  for (let index = startIndex; index < endIndex; index += 1) {
    const current = input.grid[index];
    const next = input.grid[index + 1];
    if (current.end.getTime() !== next.start.getTime()) return null;
  }

  return {
    interval: {
      start: input.grid[startIndex].start,
      end: input.grid[endIndex].end,
    },
    hours: input.hours,
  };
}

export function dateRangeKeys(startDate: string, endDate: string, limit = 62): string[] {
  const keys: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate && keys.length < limit) {
    keys.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
  return keys;
}

export function todayKey(now = new Date()): string {
  return istDateKey(now);
}
