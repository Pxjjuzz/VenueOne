import { z } from "zod";

export type CancellationPolicy = {
  cancellationDeadlineHours: number;
  fullRefundHours: number;
  partialRefundHours: number;
  partialRefundPercent: number;
  notes: string;
};

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  cancellationDeadlineHours: 2,
  fullRefundHours: 72,
  partialRefundHours: 24,
  partialRefundPercent: 50,
  notes:
    "Refund eligibility is calculated from the booking start time in India Standard Time.",
};

export const cancellationPolicySchema = z
  .object({
    cancellationDeadlineHours: z.coerce.number().int().min(0).max(720),
    fullRefundHours: z.coerce.number().int().min(1).max(2160),
    partialRefundHours: z.coerce.number().int().min(0).max(2160),
    partialRefundPercent: z.coerce.number().int().min(0).max(100),
    notes: z.string().trim().max(1000).default(""),
  })
  .refine((value) => value.fullRefundHours > value.partialRefundHours, {
    message: "The full-refund window must be longer than the partial-refund window.",
    path: ["fullRefundHours"],
  })
  .refine((value) => value.cancellationDeadlineHours <= value.partialRefundHours, {
    message: "The cancellation deadline cannot be longer than the partial-refund window.",
    path: ["cancellationDeadlineHours"],
  });

export function parseCancellationPolicy(value: unknown): CancellationPolicy {
  const parsed = cancellationPolicySchema.safeParse(value);
  if (!parsed.success) return DEFAULT_CANCELLATION_POLICY;
  return parsed.data;
}

export type RefundDecision = {
  allowed: boolean;
  percent: number;
  amountPaise: number;
  hoursBeforeStart: number;
  reason: string;
};

export function calculateRefund(input: {
  policy: CancellationPolicy;
  startsAt: Date;
  now: Date;
  totalPaise: number;
}): RefundDecision {
  const hoursBeforeStart = (input.startsAt.getTime() - input.now.getTime()) / 3_600_000;

  if (hoursBeforeStart < 0) {
    return {
      allowed: false,
      percent: 0,
      amountPaise: 0,
      hoursBeforeStart,
      reason: "The booking has already started.",
    };
  }

  if (hoursBeforeStart < input.policy.cancellationDeadlineHours) {
    return {
      allowed: false,
      percent: 0,
      amountPaise: 0,
      hoursBeforeStart,
      reason: `Cancellation requests close ${input.policy.cancellationDeadlineHours} hours before the booking starts.`,
    };
  }

  if (hoursBeforeStart >= input.policy.fullRefundHours) {
    return {
      allowed: true,
      percent: 100,
      amountPaise: input.totalPaise,
      hoursBeforeStart,
      reason: "Cancelled inside the full-refund window.",
    };
  }

  if (hoursBeforeStart >= input.policy.partialRefundHours) {
    return {
      allowed: true,
      percent: input.policy.partialRefundPercent,
      amountPaise: Math.round((input.totalPaise * input.policy.partialRefundPercent) / 100),
      hoursBeforeStart,
      reason: "Cancelled inside the partial-refund window.",
    };
  }

  return {
    allowed: true,
    percent: 0,
    amountPaise: 0,
    hoursBeforeStart,
    reason: "The booking is inside the non-refundable period.",
  };
}

export function computeTotals(input: {
  subtotalPaise: number;
  platformFeePaise: number;
  taxPercent: number;
}): { subtotalPaise: number; feePaise: number; taxPaise: number; totalPaise: number } {
  const subtotal = Math.max(0, Math.round(input.subtotalPaise));
  const fee = Math.max(0, Math.round(input.platformFeePaise));
  const tax = Math.round((subtotal * Math.max(0, input.taxPercent)) / 100);
  return {
    subtotalPaise: subtotal,
    feePaise: fee,
    taxPaise: tax,
    totalPaise: subtotal + fee + tax,
  };
}

export function describePolicy(policy: CancellationPolicy): string[] {
  return [
    `Free cancellation until ${policy.fullRefundHours} hours before the booking starts.`,
    `${policy.partialRefundPercent}% refund between ${policy.partialRefundHours} and ${policy.fullRefundHours} hours before the start.`,
    `Cancellation requests close ${policy.cancellationDeadlineHours} hours before the start.`,
  ];
}
