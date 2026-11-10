"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { limitByIp, limitByUser } from "@/lib/rate-limit";
import {
  createBookingSchema,
  cancellationRequestSchema,
  paymentVerifySchema,
} from "@/lib/validation";
import { createBooking } from "@/lib/booking/create-booking";
import { quoteBooking, type BookingQuote } from "@/lib/booking/quote";
import {
  confirmDemoPayment,
  startPayment,
  verifyRazorpayPayment,
  type PaymentConfirmationResult,
  type PaymentStartResult,
} from "@/lib/payments/service";
import {
  requestCancellation,
  withdrawCancellation,
} from "@/lib/booking/cancellation";

export type BookingActionState = {
  error?: string;
  success?: string;
  signIn?: boolean;
  fieldErrors?: Record<string, string[]>;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string): string | undefined {
  const value = text(formData, key);
  return value || undefined;
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = text(formData, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function createBookingAction(
  _previous: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: "Your session has ended. Sign in again to complete this booking.",
      signIn: true,
    };
  }

  const rate = await limitByUser("booking-create", user.id, 18, 600);
  if (!rate.ok) {
    return { error: "Too many booking attempts. Wait a few minutes and try again." };
  }

  const parsed = createBookingSchema.safeParse({
    venueId: text(formData, "venueId"),
    date: text(formData, "date"),
    slotType: text(formData, "slotType"),
    startTime: optionalText(formData, "startTime"),
    hours: optionalNumber(formData, "hours"),
    guestCount: optionalNumber(formData, "guestCount"),
    eventType: optionalText(formData, "eventType"),
    notes: optionalText(formData, "notes"),
    idempotencyKey: text(formData, "idempotencyKey"),
  });

  if (!parsed.success) {
    return {
      error: "Check the booking details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await createBooking({
    ...parsed.data,
    customerId: user.id,
    customerEmail: user.email,
    customerName: user.fullName,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/dashboard/bookings/${result.bookingId}`);
}

const quoteSchema = z.object({
  venueId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotType: z.enum(["half_day_morning", "half_day_afternoon", "full_day", "hourly"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  hours: z.number().int().min(1).max(12).optional(),
  guestCount: z.number().int().min(1).max(100000).optional(),
});

export async function quoteBookingAction(input: {
  venueId: string;
  date: string;
  slotType: string;
  startTime?: string;
  hours?: number;
  guestCount?: number;
}): Promise<BookingQuote> {
  const rate = await limitByIp("booking-quote", 240, 60);
  if (!rate.ok) {
    return { ok: false, code: "invalid", error: "Too many price checks. Wait a moment." };
  }

  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid", error: "Choose a valid date and slot." };
  }

  return quoteBooking(parsed.data);
}

const bookingIdSchema = z.string().uuid();

export async function startPaymentAction(bookingId: string): Promise<PaymentStartResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, code: "forbidden", error: "Sign in again to complete payment." };
  }
  const rate = await limitByUser("payment-start", user.id, 20, 600);
  if (!rate.ok) {
    return { ok: false, code: "unavailable", error: "Too many payment attempts. Wait a few minutes." };
  }
  const parsed = bookingIdSchema.safeParse(bookingId);
  if (!parsed.success) {
    return { ok: false, code: "not_found", error: "This booking could not be found." };
  }
  return startPayment({ bookingId: parsed.data, userId: user.id });
}

export async function verifyPaymentAction(
  input: unknown,
): Promise<PaymentConfirmationResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, code: "forbidden", error: "Sign in again to confirm this payment." };
  }
  const rate = await limitByUser("payment-verify", user.id, 30, 600);
  if (!rate.ok) {
    return { ok: false, code: "unavailable", error: "Too many verification attempts. Wait a few minutes." };
  }
  const parsed = paymentVerifySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_signature", error: "The payment response was incomplete." };
  }

  const result = await verifyRazorpayPayment({
    ...parsed.data,
    userId: user.id,
  });

  if (result.ok) {
    revalidatePath(`/dashboard/bookings/${parsed.data.bookingId}`);
    revalidatePath("/dashboard");
  }
  return result;
}

export async function demoPaymentAction(input: {
  bookingId: string;
  paymentId?: string;
}): Promise<PaymentConfirmationResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, code: "forbidden", error: "Sign in again to complete this booking." };
  }
  const rate = await limitByUser("payment-demo", user.id, 15, 600);
  if (!rate.ok) {
    return { ok: false, code: "unavailable", error: "Too many attempts. Wait a few minutes." };
  }
  const parsed = bookingIdSchema.safeParse(input.bookingId);
  if (!parsed.success) {
    return { ok: false, code: "not_found", error: "This booking could not be found." };
  }

  const result = await confirmDemoPayment({
    bookingId: parsed.data,
    userId: user.id,
    paymentId: input.paymentId,
  });

  if (result.ok) {
    revalidatePath(`/dashboard/bookings/${parsed.data}`);
    revalidatePath("/dashboard");
  }
  return result;
}

export async function requestCancellationAction(
  _previous: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Your session has ended. Sign in again.", signIn: true };
  }
  const rate = await limitByUser("cancellation-request", user.id, 8, 3600);
  if (!rate.ok) {
    return { error: "Too many cancellation requests. Contact support if you need help." };
  }

  const parsed = cancellationRequestSchema.safeParse({
    bookingId: text(formData, "bookingId"),
    reason: text(formData, "reason"),
  });
  if (!parsed.success) {
    return {
      error: "Check the cancellation details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await requestCancellation({
    bookingId: parsed.data.bookingId,
    customerId: user.id,
    reason: parsed.data.reason,
  });
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/dashboard/bookings/${parsed.data.bookingId}`);
  revalidatePath("/dashboard");
  return { success: result.message };
}

export async function withdrawCancellationAction(
  _previous: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has ended. Sign in again.", signIn: true };
  const cancellationId = text(formData, "cancellationId");
  const bookingId = text(formData, "bookingId");
  if (!cancellationId) return { error: "This cancellation could not be found." };

  const result = await withdrawCancellation({
    cancellationId,
    customerId: user.id,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return { success: "Cancellation request withdrawn. Your booking remains confirmed." };
}
