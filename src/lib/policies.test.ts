import { describe, expect, it } from "vitest";
import {
  DEFAULT_CANCELLATION_POLICY,
  calculateRefund,
  computeTotals,
  parseCancellationPolicy,
} from "@/lib/policies";

const HOUR = 3_600_000;
const startsAt = new Date("2026-11-20T06:00:00Z");

function refund(hoursBeforeStart: number, totalPaise = 100_000) {
  return calculateRefund({
    policy: DEFAULT_CANCELLATION_POLICY,
    startsAt,
    now: new Date(startsAt.getTime() - hoursBeforeStart * HOUR),
    totalPaise,
  });
}

describe("cancellation refund windows", () => {
  it("allows a full refund at exactly the full-refund boundary", () => {
    const decision = refund(72);
    expect(decision.allowed).toBe(true);
    expect(decision.percent).toBe(100);
    expect(decision.amountPaise).toBe(100_000);
  });

  it("applies the partial percentage just inside the full-refund window", () => {
    const decision = refund(71.5);
    expect(decision.allowed).toBe(true);
    expect(decision.percent).toBe(50);
    expect(decision.amountPaise).toBe(50_000);
  });

  it("keeps partial eligibility at its own boundary", () => {
    expect(refund(24).percent).toBe(50);
  });

  it("allows cancellation with no refund inside the non-refundable period", () => {
    const decision = refund(12);
    expect(decision.allowed).toBe(true);
    expect(decision.percent).toBe(0);
    expect(decision.amountPaise).toBe(0);
  });

  it("closes requests at the deadline", () => {
    expect(refund(2).allowed).toBe(true);
    const late = refund(1.9);
    expect(late.allowed).toBe(false);
    expect(late.reason).toContain("close");
  });

  it("rejects cancellations after the booking has started", () => {
    const decision = refund(-1);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("already started");
  });

  it("rounds partial refunds to whole paise", () => {
    const decision = calculateRefund({
      policy: { ...DEFAULT_CANCELLATION_POLICY, partialRefundPercent: 33 },
      startsAt,
      now: new Date(startsAt.getTime() - 48 * HOUR),
      totalPaise: 99_999,
    });
    expect(decision.amountPaise).toBe(33_000);
  });
});

describe("policy parsing", () => {
  it("falls back to the default policy when stored data is invalid", () => {
    expect(parseCancellationPolicy({ fullRefundHours: "nope" })).toEqual(
      DEFAULT_CANCELLATION_POLICY,
    );
  });

  it("rejects a full-refund window shorter than the partial window", () => {
    const parsed = parseCancellationPolicy({
      cancellationDeadlineHours: 2,
      fullRefundHours: 10,
      partialRefundHours: 20,
      partialRefundPercent: 50,
      notes: "",
    });
    expect(parsed).toEqual(DEFAULT_CANCELLATION_POLICY);
  });
});

describe("booking totals", () => {
  it("adds fee after the subtotal and tax on the subtotal only", () => {
    expect(
      computeTotals({ subtotalPaise: 10_000, platformFeePaise: 500, taxPercent: 18 }),
    ).toEqual({
      subtotalPaise: 10_000,
      feePaise: 500,
      taxPaise: 1_800,
      totalPaise: 12_300,
    });
  });

  it("clamps negative money inputs", () => {
    expect(
      computeTotals({ subtotalPaise: -500, platformFeePaise: -100, taxPercent: -18 }),
    ).toEqual({ subtotalPaise: 0, feePaise: 0, taxPaise: 0, totalPaise: 0 });
  });
});
