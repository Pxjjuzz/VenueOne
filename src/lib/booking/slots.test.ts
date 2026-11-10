import { describe, expect, it } from "vitest";
import {
  buildHallGrid,
  buildHourGrid,
  hourlyBookingInterval,
  isValidDayHours,
  overlaps,
  slotIsFree,
} from "@/lib/booking/slots";
import { istDateTime } from "@/lib/time";

const openDay = { weekday: 6, opensAt: "09:00", closesAt: "17:00", isClosed: false };

function iv(start: string, end: string) {
  return { start: new Date(start), end: new Date(end) };
}

describe("day hours", () => {
  it("accepts hour-aligned ranges that end after they open", () => {
    expect(isValidDayHours(openDay)).toBe(true);
  });

  it("rejects closed days, half-hour boundaries and inverted ranges", () => {
    expect(isValidDayHours({ ...openDay, isClosed: true })).toBe(false);
    expect(isValidDayHours({ ...openDay, opensAt: "09:30" })).toBe(false);
    expect(isValidDayHours({ ...openDay, closesAt: "08:00" })).toBe(false);
  });
});

describe("buildHallGrid", () => {
  it("splits an eight-hour day into equal halves in IST", () => {
    const grid = buildHallGrid("2026-11-14", openDay);
    expect(grid).not.toBeNull();
    expect(grid!.morning.start.toISOString()).toBe(
      istDateTime("2026-11-14", "09:00").toISOString(),
    );
    expect(grid!.morning.end.toISOString()).toBe(
      istDateTime("2026-11-14", "13:00").toISOString(),
    );
    expect(grid!.afternoon.end.toISOString()).toBe(
      istDateTime("2026-11-14", "17:00").toISOString(),
    );
    expect(grid!.full.start.toISOString()).toBe(grid!.morning.start.toISOString());
    expect(grid!.full.end.toISOString()).toBe(grid!.afternoon.end.toISOString());
  });

  it("returns null for days shorter than two hours", () => {
    expect(
      buildHallGrid("2026-11-14", { ...openDay, opensAt: "09:00", closesAt: "10:00" }),
    ).toBeNull();
  });
});

describe("hourly grid", () => {
  it("builds one row per full hour and merges contiguous hours", () => {
    const grid = buildHourGrid("2026-11-14", {
      ...openDay,
      closesAt: "12:00",
    });
    expect(grid).toHaveLength(3);
    expect(grid.map((slot) => slot.time)).toEqual(["09:00", "10:00", "11:00"]);

    const result = hourlyBookingInterval({
      dateKey: "2026-11-14",
      grid,
      startTime: "09:00",
      hours: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.interval.start.toISOString()).toBe(grid[0].start.toISOString());
    expect(result!.interval.end.toISOString()).toBe(grid[1].end.toISOString());
  });

  it("refuses ranges that leave the grid or have no hours", () => {
    const grid = buildHourGrid("2026-11-14", { ...openDay, closesAt: "12:00" });
    const base = { dateKey: "2026-11-14", grid, startTime: "09:00" };
    expect(hourlyBookingInterval({ ...base, hours: 0 })).toBeNull();
    expect(hourlyBookingInterval({ ...base, hours: 4 })).toBeNull();
    expect(hourlyBookingInterval({ ...base, startTime: "12:00", hours: 1 })).toBeNull();
    expect(hourlyBookingInterval({ ...base, startTime: "08:00", hours: 1 })).toBeNull();
  });

  it("rejects gapped grids", () => {
    const grid = buildHourGrid("2026-11-14", { ...openDay, closesAt: "11:00" });
    const gapped = [grid[0], { ...grid[1], start: new Date(grid[1].start.getTime() + 60_000) }];
    expect(
      hourlyBookingInterval({
        dateKey: "2026-11-14",
        grid: gapped,
        startTime: "09:00",
        hours: 2,
      }),
    ).toBeNull();
  });
});

describe("overlap checks", () => {
  it("treats touching intervals as free, not overlapping", () => {
    expect(
      overlaps(
        iv("2026-11-14T09:00:00+05:30", "2026-11-14T11:00:00+05:30"),
        iv("2026-11-14T11:00:00+05:30", "2026-11-14T13:00:00+05:30"),
      ),
    ).toBe(false);
  });

  it("detects partial and contained overlaps", () => {
    const booking = iv("2026-11-14T09:00:00+05:30", "2026-11-14T13:00:00+05:30");
    expect(
      overlaps(booking, iv("2026-11-14T12:00:00+05:30", "2026-11-14T15:00:00+05:30")),
    ).toBe(true);
    expect(
      overlaps(booking, iv("2026-11-14T10:00:00+05:30", "2026-11-14T11:00:00+05:30")),
    ).toBe(true);
  });

  it("blocks a slot occupied by either a booking or an owner block", () => {
    const slot = iv("2026-11-14T09:00:00+05:30", "2026-11-14T10:00:00+05:30");
    const booking = iv("2026-11-14T08:00:00+05:30", "2026-11-14T09:30:00+05:30");
    const block = iv("2026-11-14T09:30:00+05:30", "2026-11-14T11:00:00+05:30");
    expect(slotIsFree(slot, [booking], [])).toBe(false);
    expect(slotIsFree(slot, [], [block])).toBe(false);
    expect(slotIsFree(slot, [], [])).toBe(true);
  });
});
