import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { dbQuery, withTransaction, type Sql } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { formatMoney } from "@/lib/format";
import { renderPaymentInvoiceEmail } from "@/lib/email/templates";
import { formatIstDateLong, formatTimeRange } from "@/lib/time";
import type { BookingStatus, PaymentStatus, PaymentTxnStatus } from "@/lib/types";
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "./signature";
import {
  demoPaymentsEnabled,
  getRazorpayClient,
  getRazorpayConfig,
  safeProviderMessage,
  type RazorpayPayment,
} from "./razorpay";

export type PaymentErrorCode =
  | "not_found"
  | "forbidden"
  | "invalid_state"
  | "expired"
  | "invalid_signature"
  | "amount_mismatch"
  | "provider_error"
  | "not_configured"
  | "unavailable";

export type PaymentStartResult =
  | {
      ok: true;
      mode: "razorpay";
      paymentId: string;
      orderId: string;
      keyId: string;
      amountPaise: number;
      currency: string;
      bookingReference: string;
      venueName: string;
      testMode: boolean;
      prefill: { name: string; email: string; contact: string | null };
    }
  | {
      ok: true;
      mode: "demo";
      paymentId: string;
      amountPaise: number;
      currency: string;
      bookingReference: string;
      venueName: string;
    }
  | {
      ok: false;
      code: PaymentErrorCode;
      error: string;
      bookingReference?: string;
    };

export type PaymentConfirmationResult =
  | {
      ok: true;
      status: BookingStatus;
      paymentStatus: PaymentStatus;
      reference: string;
      message: string;
      idempotent: boolean;
    }
  | {
      ok: false;
      code: PaymentErrorCode;
      error: string;
      reference?: string;
    };

export type RefundActionResult =
  | {
      ok: true;
      status: "initiated" | "processed";
      message: string;
      providerRefundId: string;
    }
  | { ok: false; code: PaymentErrorCode; error: string };

export type WebhookResult = {
  ok: boolean;
  httpStatus: number;
  message: string;
  duplicate?: boolean;
  handled?: boolean;
};

type BookingPaymentRow = {
  id: string;
  reference: string;
  customer_id: string;
  venue_id: string;
  owner_id: string | null;
  venue_name: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_paise: number;
  currency: string;
  hold_expires_at: Date | null;
};

type PaymentRecord = {
  id: string;
  booking_id: string;
  provider: "razorpay" | "demo";
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount_paise: number;
  currency: string;
  status: PaymentTxnStatus;
  is_demo: boolean;
  method: string | null;
  receipt: string | null;
  failure_reason: string | null;
  notes: Record<string, unknown>;
  captured_at: Date | null;
};

async function loadBookingPayment(
  sql: Sql,
  bookingId: string,
  lock = false,
): Promise<BookingPaymentRow | null> {
  const rows = await sql<BookingPaymentRow>(
    `select b.id, b.reference, b.customer_id, b.venue_id, v.owner_id,
            v.name as venue_name, b.status, b.payment_status, b.total_paise,
            b.currency, b.hold_expires_at
     from bookings b
     join venues v on v.id = b.venue_id
     where b.id = $1
     ${lock ? "for update of b" : ""}`,
    [bookingId],
  );
  return rows[0] ?? null;
}

async function loadPayment(sql: Sql, paymentId: string, lock = false): Promise<PaymentRecord | null> {
  const rows = await sql<PaymentRecord>(
    `select * from payments where id = $1 ${lock ? "for update" : ""}`,
    [paymentId],
  );
  return rows[0] ?? null;
}

async function findPaymentForOrder(
  sql: Sql,
  orderId: string,
  lock = false,
): Promise<PaymentRecord | null> {
  const rows = await sql<PaymentRecord>(
    `select * from payments where provider_order_id = $1 ${lock ? "for update" : ""}`,
    [orderId],
  );
  return rows[0] ?? null;
}

function isRazorpayPaymentPaid(payment: RazorpayPayment): boolean {
  return payment.status === "captured" || Boolean(payment.captured);
}

async function confirmBookingAfterCapture(input: {
  sql: Sql;
  payment: PaymentRecord;
  providerPaymentId: string;
  method: string | null;
  note: string;
  providerSnapshot: Record<string, unknown>;
}): Promise<{
  booking: BookingPaymentRow;
  changed: boolean;
  late: boolean;
}> {
  const booking = await loadBookingPayment(input.sql, input.payment.booking_id, true);
  if (!booking) throw new Error("Booking missing for captured payment.");

  const existing = await loadPayment(input.sql, input.payment.id, true);
  if (!existing) throw new Error("Payment record missing.");

  const alreadyCaptured =
    existing.status === "captured" ||
    existing.status === "refunded" ||
    existing.status === "partially_refunded";

  if (!alreadyCaptured) {
    await input.sql(
      `update payments
       set status = 'captured',
           provider_payment_id = coalesce(provider_payment_id, $2),
           method = coalesce($3, method),
           captured_at = coalesce(captured_at, now()),
           failure_reason = null,
           notes = notes || $4::jsonb,
           updated_at = now()
       where id = $1`,
      [
        input.payment.id,
        input.providerPaymentId,
        input.method,
        JSON.stringify({
          providerSnapshot: input.providerSnapshot,
          capturedVia: input.note,
        }),
      ],
    );
  }

  if (booking.status === "confirmed") {
    await input.sql(
      `update bookings
       set payment_status = 'paid', hold_expires_at = null, updated_at = now()
       where id = $1`,
      [booking.id],
    );
    return { booking: { ...booking, payment_status: "paid" }, changed: false, late: false };
  }

  if (booking.status === "awaiting_payment") {
    await input.sql(
      `update bookings
       set status = 'confirmed', payment_status = 'paid',
           hold_expires_at = null, updated_at = now()
       where id = $1`,
      [booking.id],
    );
    await input.sql(
      `insert into booking_status_history (booking_id, from_status, to_status, actor_id, note)
       values ($1, 'awaiting_payment', 'confirmed', null, $2)`,
      [booking.id, input.note],
    );
    return { booking: { ...booking, status: "confirmed", payment_status: "paid" }, changed: true, late: false };
  }

  // Payment arrived but the booking is no longer in a payable state. Never
  // confirm an expired or cancelled booking; record the money and escalate.
  await input.sql(
    `update bookings set payment_status = 'paid', updated_at = now() where id = $1`,
    [booking.id],
  );
  await input.sql(
    `insert into booking_status_history (booking_id, from_status, to_status, actor_id, note)
     values ($1, $2, $2, null, $3)`,
    [booking.id, booking.status, input.note],
  );
  return {
    booking: { ...booking, payment_status: "paid" },
    changed: false,
    late: true,
  };
}

async function notifyCapture(input: {
  booking: BookingPaymentRow;
  changed: boolean;
  late: boolean;
  amountPaise: number;
}): Promise<void> {
  const amount = formatMoney(input.amountPaise);
  if (input.late) {
    await notifyUser(input.booking.customer_id, {
      type: "payment.late",
      title: "Payment received after the booking closed",
      body: `We received ${amount} for ${input.booking.reference}, but the booking could not be confirmed because its hold had expired or it was cancelled. Support will review a refund. No refund is confirmed yet.`,
      link: `/dashboard/bookings/${input.booking.id}`,
      email: true,
    });
    await notifyAdmins({
      type: "admin.payment_late",
      title: "Payment captured for a closed booking",
      body: `${input.booking.reference} (${input.booking.venue_name}) captured ${amount} while the booking was ${input.booking.status}. Review and initiate a refund.`,
      link: `/admin/payments`,
      email: true,
    });
    return;
  }

  if (!input.changed) return;

  const fullRows = await dbQuery<{
    starts_at: Date;
    ends_at: Date;
    subtotal_paise: number;
    fee_paise: number;
    tax_paise: number;
    slot_type: string;
    city: string | null;
    customer_name: string | null;
  }>(
    `select b.starts_at, b.ends_at, b.subtotal_paise, b.fee_paise, b.tax_paise, b.slot_type,
            v.city, p.full_name as customer_name
     from bookings b
     join venues v on v.id = b.venue_id
     left join profiles p on p.id = b.customer_id
     where b.id = $1`,
    [input.booking.id],
  );

  const fb = fullRows[0];
  const dateStr = fb ? formatIstDateLong(fb.starts_at) : "";
  const timeStr = fb ? formatTimeRange(fb.starts_at, fb.ends_at) : "";

  const invoice = renderPaymentInvoiceEmail({
    customerName: fb?.customer_name,
    reference: input.booking.reference,
    invoiceNumber: `INV-${input.booking.reference}`,
    venueName: input.booking.venue_name,
    venueCity: fb?.city,
    slotLabel: fb?.slot_type || "Standard",
    dateStr,
    timeStr,
    subtotalPaise: fb?.subtotal_paise ?? input.booking.total_paise,
    feePaise: fb?.fee_paise ?? 0,
    taxPaise: fb?.tax_paise ?? 0,
    totalPaise: input.booking.total_paise,
    bookingId: input.booking.id,
  });

  await notifyUser(input.booking.customer_id, {
    type: "payment.confirmed",
    title: invoice.subject,
    body: `Your booking at ${input.booking.venue_name} is confirmed. We received ${amount}.`,
    link: `/dashboard/bookings/${input.booking.id}`,
    email: true,
    emailSubject: invoice.subject,
    emailHtml: invoice.html,
    emailText: invoice.text,
  });

  if (input.booking.owner_id) {
    await notifyUser(input.booking.owner_id, {
      type: "owner.booking_confirmed",
      title: "Booking confirmed",
      body: `${input.booking.reference} at ${input.booking.venue_name} is confirmed and paid.`,
      link: "/owner/bookings",
      email: true,
    });
  }
}

async function markPaymentFailed(input: {
  paymentId: string;
  providerPaymentId: string | null;
  reason: string;
  providerSnapshot?: Record<string, unknown>;
}): Promise<{ booking: BookingPaymentRow | null; changed: boolean }> {
  return withTransaction(async (sql) => {
    const payment = await loadPayment(sql, input.paymentId, true);
    if (!payment) return { booking: null, changed: false };
    if (
      payment.status === "captured" ||
      payment.status === "refunded" ||
      payment.status === "partially_refunded"
    ) {
      return { booking: null, changed: false };
    }

    await sql(
      `update payments
       set status = 'failed',
           provider_payment_id = coalesce(provider_payment_id, $2),
           failure_reason = $3,
           notes = notes || $4::jsonb,
           updated_at = now()
       where id = $1`,
      [
        input.paymentId,
        input.providerPaymentId,
        input.reason.slice(0, 500),
        JSON.stringify({ providerSnapshot: input.providerSnapshot ?? {} }),
      ],
    );

    const booking = await loadBookingPayment(sql, payment.booking_id, true);
    if (booking?.status === "awaiting_payment") {
      await sql(
        `update bookings set payment_status = 'failed', updated_at = now()
         where id = $1 and status = 'awaiting_payment'`,
        [booking.id],
      );
    }

    return { booking, changed: true };
  });
}

export async function startPayment(input: {
  bookingId: string;
  userId: string;
}): Promise<PaymentStartResult> {
  await dbQuery("select refresh_booking_states()");

  const booking = await withTransaction((sql) => loadBookingPayment(sql, input.bookingId, true));
  if (!booking) {
    return { ok: false, code: "not_found", error: "This booking could not be found." };
  }
  if (booking.customer_id !== input.userId) {
    return { ok: false, code: "forbidden", error: "You do not have access to this booking." };
  }
  if (booking.status === "confirmed") {
    return {
      ok: false,
      code: "invalid_state",
      error: "This booking is already paid and confirmed.",
    };
  }
  if (booking.status !== "awaiting_payment") {
    return {
      ok: false,
      code: "invalid_state",
      error: "This booking is not awaiting payment.",
      bookingReference: booking.reference,
    };
  }
  if (booking.hold_expires_at && booking.hold_expires_at.getTime() <= Date.now()) {
    return {
      ok: false,
      code: "expired",
      error: "The payment window for this booking has closed. Please book again.",
      bookingReference: booking.reference,
    };
  }
  if (booking.total_paise <= 0) {
    return {
      ok: false,
      code: "invalid_state",
      error: "This booking does not require an online payment. Contact the venue.",
      bookingReference: booking.reference,
    };
  }

  const profiles = await dbQuery<{
    full_name: string | null;
    email: string;
    phone: string | null;
  }>("select full_name, email, phone from profiles where id = $1", [input.userId]);
  const profile = profiles[0];

  const config = getRazorpayConfig();
  if (config) {
    return startRazorpayPayment({ booking, config, profile });
  }

  if (demoPaymentsEnabled()) {
    return startDemoPayment(booking);
  }

  return {
    ok: false,
    code: "not_configured",
    error:
      "Online payments are not configured. The venue can still receive booking requests; contact support for help.",
    bookingReference: booking.reference,
  };
}

async function startRazorpayPayment(input: {
  booking: BookingPaymentRow;
  config: NonNullable<ReturnType<typeof getRazorpayConfig>>;
  profile?: { full_name: string | null; email: string; phone: string | null };
}): Promise<PaymentStartResult> {
  const { booking, config } = input;

  const existingRows = await dbQuery<PaymentRecord>(
    `select * from payments
     where booking_id = $1 and provider = 'razorpay' and status = 'created'
     order by created_at desc limit 1`,
    [booking.id],
  );
  const existing = existingRows[0];
  const existingKeyId =
    existing && typeof existing.notes?.keyId === "string" ? existing.notes.keyId : null;

  if (
    existing &&
    existingKeyId === config.keyId &&
    existing.amount_paise === booking.total_paise &&
    existing.provider_order_id
  ) {
    return {
      ok: true,
      mode: "razorpay",
      paymentId: existing.id,
      orderId: existing.provider_order_id,
      keyId: config.keyId,
      amountPaise: existing.amount_paise,
      currency: existing.currency,
      bookingReference: booking.reference,
      venueName: booking.venue_name,
      testMode: config.testMode,
      prefill: {
        name: input.profile?.full_name ?? "",
        email: input.profile?.email ?? "",
        contact: input.profile?.phone ?? null,
      },
    };
  }

  let order;
  try {
    const { client } = await getRazorpayClient();
    order = await client.orders.create({
      amount: booking.total_paise,
      currency: booking.currency,
      receipt: booking.reference,
      notes: {
        bookingId: booking.id,
        bookingReference: booking.reference,
        customerId: booking.customer_id,
      },
      payment_capture: 1,
    });
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    return {
      ok: false,
      code: "provider_error",
      error: safeProviderMessage(error),
      bookingReference: booking.reference,
    };
  }

  const paymentId = randomUUID();
  try {
    await dbQuery(
      `update payments
       set status = 'failed', failure_reason = 'Superseded by a newer payment attempt', updated_at = now()
       where booking_id = $1 and provider = 'razorpay' and status = 'created'`,
      [booking.id],
    );
    await dbQuery(
      `insert into payments (
         id, booking_id, provider, provider_order_id, amount_paise, currency,
         status, is_demo, receipt, notes
       ) values ($1, $2, 'razorpay', $3, $4, $5, 'created', false, $6, $7::jsonb)`,
      [
        paymentId,
        booking.id,
        order.id,
        booking.total_paise,
        booking.currency,
        booking.reference,
        JSON.stringify({
          keyId: config.keyId,
          mode: config.testMode ? "razorpay_test" : "razorpay_live",
          providerOrderStatus: order.status,
        }),
      ],
    );
  } catch (error) {
    console.error("Payment record insert failed after Razorpay order was created", error);
    return {
      ok: false,
      code: "provider_error",
      error: "The payment could not be prepared. Please try again.",
      bookingReference: booking.reference,
    };
  }

  return {
    ok: true,
    mode: "razorpay",
    paymentId,
    orderId: order.id,
    keyId: config.keyId,
    amountPaise: booking.total_paise,
    currency: booking.currency,
    bookingReference: booking.reference,
    venueName: booking.venue_name,
    testMode: config.testMode,
    prefill: {
      name: input.profile?.full_name ?? "",
      email: input.profile?.email ?? "",
      contact: input.profile?.phone ?? null,
    },
  };
}

async function startDemoPayment(booking: BookingPaymentRow): Promise<PaymentStartResult> {
  const rows = await dbQuery<PaymentRecord>(
    `select * from payments
     where booking_id = $1 and provider = 'demo' and status = 'created'
     order by created_at desc limit 1`,
    [booking.id],
  );
  if (rows[0]) {
    return {
      ok: true,
      mode: "demo",
      paymentId: rows[0].id,
      amountPaise: rows[0].amount_paise,
      currency: rows[0].currency,
      bookingReference: booking.reference,
      venueName: booking.venue_name,
    };
  }

  const paymentId = randomUUID();
  await dbQuery(
    `insert into payments (
       id, booking_id, provider, amount_paise, currency, status, is_demo, receipt, notes
     ) values ($1, $2, 'demo', $3, $4, 'created', true, $5, $6::jsonb)`,
    [
      paymentId,
      booking.id,
      booking.total_paise,
      booking.currency,
      booking.reference,
      JSON.stringify({
        mode: "demo",
        notice:
          "Local development only. No money moves. Demo payments are disabled in production.",
      }),
    ],
  );

  return {
    ok: true,
    mode: "demo",
    paymentId,
    amountPaise: booking.total_paise,
    currency: booking.currency,
    bookingReference: booking.reference,
    venueName: booking.venue_name,
  };
}

export async function confirmDemoPayment(input: {
  bookingId: string;
  userId: string;
  paymentId?: string;
}): Promise<PaymentConfirmationResult> {
  if (!demoPaymentsEnabled()) {
    return {
      ok: false,
      code: "unavailable",
      error: "Demo payments are not available in this environment.",
    };
  }

  await dbQuery("select refresh_booking_states()");

  const result = await withTransaction(async (sql) => {
    const booking = await loadBookingPayment(sql, input.bookingId, true);
    if (!booking) {
      return { kind: "error" as const, code: "not_found" as const, error: "This booking could not be found." };
    }
    if (booking.customer_id !== input.userId) {
      return { kind: "error" as const, code: "forbidden" as const, error: "You do not have access to this booking." };
    }
    if (booking.status === "confirmed" && booking.payment_status === "paid") {
      return {
        kind: "idempotent" as const,
        booking,
      };
    }
    if (booking.status !== "awaiting_payment") {
      return {
        kind: "error" as const,
        code: "invalid_state" as const,
        error: "This booking is no longer awaiting payment.",
        reference: booking.reference,
      };
    }
    if (booking.hold_expires_at && booking.hold_expires_at.getTime() <= Date.now()) {
      return {
        kind: "error" as const,
        code: "expired" as const,
        error: "The payment window for this booking has closed.",
        reference: booking.reference,
      };
    }

    let payment: PaymentRecord | null = null;
    if (input.paymentId) {
      payment = await loadPayment(sql, input.paymentId, true);
      if (payment && (payment.booking_id !== booking.id || payment.provider !== "demo")) {
        payment = null;
      }
    }
    if (!payment) {
      const rows = await sql<PaymentRecord>(
        `select * from payments
         where booking_id = $1 and provider = 'demo' and status = 'created'
         order by created_at desc limit 1 for update`,
        [booking.id],
      );
      payment = rows[0] ?? null;
    }

    const providerPaymentId = `demo_pay_${randomUUID()}`;
    if (!payment) {
      const inserted = await sql<PaymentRecord>(
        `insert into payments (
           booking_id, provider, provider_payment_id, amount_paise, currency,
           status, is_demo, method, receipt, captured_at, notes
         ) values ($1, 'demo', $2, $3, $4, 'captured', true, 'demo', $5, now(), $6::jsonb)
         returning *`,
        [
          booking.id,
          providerPaymentId,
          booking.total_paise,
          booking.currency,
          booking.reference,
          JSON.stringify({ mode: "demo", capturedBy: "server" }),
        ],
      );
      payment = inserted[0] ?? null;
    } else {
      await sql(
        `update payments
         set status = 'captured', provider_payment_id = $2, method = 'demo',
             captured_at = now(), failure_reason = null,
             notes = notes || $3::jsonb, updated_at = now()
         where id = $1`,
        [
          payment.id,
          providerPaymentId,
          JSON.stringify({ mode: "demo", capturedBy: "server" }),
        ],
      );
    }

    const captured = await confirmBookingAfterCapture({
      sql,
      payment,
      providerPaymentId,
      method: "demo",
      note: "Demo payment confirmed by the server",
      providerSnapshot: { provider: "demo", id: providerPaymentId },
    });

    return { kind: "confirmed" as const, booking: captured.booking, changed: captured.changed };
  });

  if (result.kind === "error") {
    return { ok: false, code: result.code, error: result.error, reference: "reference" in result ? result.reference : undefined };
  }

  if (result.kind === "idempotent") {
    return {
      ok: true,
      status: result.booking.status,
      paymentStatus: "paid",
      reference: result.booking.reference,
      message: "This booking is already confirmed.",
      idempotent: true,
    };
  }

  await notifyCapture({
    booking: result.booking,
    changed: true,
    late: false,
    amountPaise: result.booking.total_paise,
  });
  await recordAudit({
    actorId: input.userId,
    action: "payment.demo.confirmed",
    entityType: "booking",
    entityId: result.booking.id,
    metadata: { reference: result.booking.reference, amountPaise: result.booking.total_paise },
  });

  return {
    ok: true,
    status: "confirmed",
    paymentStatus: "paid",
    reference: result.booking.reference,
    message: "Demo payment confirmed. The booking is now confirmed.",
    idempotent: false,
  };
}

export async function verifyRazorpayPayment(input: {
  bookingId: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<PaymentConfirmationResult> {
  const config = getRazorpayConfig();
  if (!config) {
    return { ok: false, code: "not_configured", error: "Online payments are not configured." };
  }

  const paymentRows = await dbQuery<PaymentRecord>(
    `select * from payments
     where booking_id = $1 and provider = 'razorpay' and provider_order_id = $2`,
    [input.bookingId, input.razorpayOrderId],
  );
  const payment = paymentRows[0];
  if (!payment) {
    return { ok: false, code: "not_found", error: "This payment attempt could not be found." };
  }

  if (
    !verifyRazorpayPaymentSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
      secret: config.keySecret,
    })
  ) {
    await recordAudit({
      actorId: input.userId,
      action: "payment.verify.invalid_signature",
      entityType: "payment",
      entityId: payment.id,
      metadata: { orderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId },
    });
    return {
      ok: false,
      code: "invalid_signature",
      error: "The payment signature could not be verified.",
    };
  }

  let providerPayment: RazorpayPayment;
  try {
    const { client } = await getRazorpayClient();
    providerPayment = await client.payments.fetch(input.razorpayPaymentId);

    if (providerPayment.order_id !== input.razorpayOrderId) {
      return {
        ok: false,
        code: "invalid_signature",
        error: "The payment does not belong to this order.",
      };
    }
    if (
      providerPayment.amount !== payment.amount_paise ||
      (providerPayment.currency || "INR") !== payment.currency
    ) {
      await recordAudit({
        actorId: input.userId,
        action: "payment.verify.amount_mismatch",
        entityType: "payment",
        entityId: payment.id,
        metadata: {
          expected: payment.amount_paise,
          received: providerPayment.amount,
          currency: providerPayment.currency,
        },
      });
      return {
        ok: false,
        code: "amount_mismatch",
        error: "The paid amount does not match this booking. Support has been notified.",
      };
    }

    if (!isRazorpayPaymentPaid(providerPayment)) {
      if (providerPayment.status === "authorized") {
        providerPayment = await client.payments.capture(
          input.razorpayPaymentId,
          payment.amount_paise,
          payment.currency,
        );
      }
    }

    if (!isRazorpayPaymentPaid(providerPayment)) {
      await markPaymentFailed({
        paymentId: payment.id,
        providerPaymentId: providerPayment.id,
        reason: providerPayment.error_description || `Provider status: ${providerPayment.status}`,
        providerSnapshot: providerPayment as unknown as Record<string, unknown>,
      });
      return {
        ok: false,
        code: "provider_error",
        error:
          providerPayment.error_description ||
          "The payment was not completed by the provider. No booking has been confirmed.",
      };
    }
  } catch (error) {
    console.error("Razorpay payment verification failed", error);
    return {
      ok: false,
      code: "provider_error",
      error:
        "We could not confirm the payment with the provider yet. If money was debited, do not pay again; the booking will update when the provider confirms.",
    };
  }

  const captured = await withTransaction(async (sql) => {
    const booking = await loadBookingPayment(sql, input.bookingId, true);
    if (!booking) throw new Error("Booking missing.");
    if (booking.customer_id !== input.userId) throw new Error("Forbidden.");
    if (booking.status === "confirmed") {
      return { booking, changed: false, late: false, idempotent: true };
    }
    return {
      ...(await confirmBookingAfterCapture({
        sql,
        payment,
        providerPaymentId: providerPayment.id,
        method: providerPayment.method ?? null,
        note: "Payment verified with Razorpay signature",
        providerSnapshot: providerPayment as unknown as Record<string, unknown>,
      })),
      idempotent: false,
    };
  }).catch((error) => {
    console.error("Payment confirmation transaction failed", error);
    return null;
  });

  if (!captured) {
    return {
      ok: false,
      code: "provider_error",
      error: "The payment was verified but the booking could not be updated. Support has been notified.",
    };
  }

  await notifyCapture({
    booking: captured.booking,
    changed: captured.changed,
    late: captured.late,
    amountPaise: payment.amount_paise,
  });

  await recordAudit({
    actorId: input.userId,
    action: "payment.verified",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      bookingId: input.bookingId,
      reference: captured.booking.reference,
      razorpayPaymentId: providerPayment.id,
      amountPaise: payment.amount_paise,
    },
  });

  if (captured.late) {
    return {
      ok: false,
      code: "expired",
      error:
        "The payment was received, but the booking hold had already closed. No booking is confirmed. Support will review a refund.",
      reference: captured.booking.reference,
    };
  }

  return {
    ok: true,
    status: "confirmed",
    paymentStatus: "paid",
    reference: captured.booking.reference,
    message: "Payment verified. Your booking is confirmed.",
    idempotent: captured.idempotent,
  };
}

type WebhookBody = {
  event?: string;
  id?: string;
  payload?: {
    payment?: { entity?: RazorpayPayment };
    order?: { entity?: { id?: string; amount?: number; currency?: string; status?: string } };
    refund?: {
      entity?: {
        id: string;
        payment_id: string;
        amount: number;
        currency?: string;
        status: string;
        speed_processed?: string | null;
      };
    };
  };
};

function webhookEventId(rawBody: string, body: WebhookBody, headerId?: string): string {
  if (headerId && headerId.trim()) return headerId.trim().slice(0, 200);
  if (typeof body.id === "string" && body.id.trim()) return body.id.trim().slice(0, 200);
  return createHash("sha256").update(rawBody).digest("hex").slice(0, 64);
}

async function applyCapturedWebhook(input: {
  body: WebhookBody;
  eventType: string;
  providerPayment: RazorpayPayment;
  eventId: string;
}): Promise<{
  duplicate: boolean;
  handled: boolean;
  notify?: () => Promise<void>;
}> {
  return withTransaction(async (sql) => {
    const inserted = await sql<{ id: number }>(
      `insert into payment_events (provider, event_id, event_type, payload)
       values ('razorpay', $1, $2, $3::jsonb)
       on conflict (provider, event_id) do nothing
       returning id`,
      [input.eventId, input.eventType, JSON.stringify(input.body)],
    );
    if (!inserted[0]) {
      return { duplicate: true, handled: false };
    }

    const byPayment = await sql<PaymentRecord>(
      `select * from payments where provider_payment_id = $1 limit 1`,
      [input.providerPayment.id],
    );
    const byOrder = input.providerPayment.order_id
      ? await findPaymentForOrder(sql, input.providerPayment.order_id)
      : null;
    const payment = byPayment[0] ?? byOrder;
    if (!payment) {
      return { duplicate: false, handled: false };
    }

    if (payment.amount_paise !== input.providerPayment.amount) {
      await sql(
        `update payments
         set notes = notes || $2::jsonb, updated_at = now()
         where id = $1`,
        [
          payment.id,
          JSON.stringify({
            webhookAmountMismatch: {
              expected: payment.amount_paise,
              received: input.providerPayment.amount,
              eventId: input.eventId,
            },
          }),
        ],
      );
      return {
        duplicate: false,
        handled: true,
        notify: async () => {
          await notifyAdmins({
            type: "admin.payment_mismatch",
            title: "Payment amount mismatch",
            body: `Razorpay reported ${input.providerPayment.amount} paise against a ${payment.amount_paise} paise payment. Booking was not confirmed.`,
            link: "/admin/payments",
            email: true,
          });
        },
      };
    }

    const captured = await confirmBookingAfterCapture({
      sql,
      payment,
      providerPaymentId: input.providerPayment.id,
      method: input.providerPayment.method ?? null,
      note: "Payment captured via Razorpay webhook",
      providerSnapshot: input.providerPayment as unknown as Record<string, unknown>,
    });

    return {
      duplicate: false,
      handled: true,
      notify: async () => {
        await notifyCapture({
          booking: captured.booking,
          changed: captured.changed,
          late: captured.late,
          amountPaise: payment.amount_paise,
        });
      },
    };
  });
}

async function applyFailedWebhook(input: {
  body: WebhookBody;
  eventType: string;
  providerPayment: RazorpayPayment;
  eventId: string;
}): Promise<{ duplicate: boolean; handled: boolean; paymentId?: string; reason: string }> {
  return withTransaction(async (sql) => {
    const inserted = await sql<{ id: number }>(
      `insert into payment_events (provider, event_id, event_type, payload)
       values ('razorpay', $1, $2, $3::jsonb)
       on conflict (provider, event_id) do nothing
       returning id`,
      [input.eventId, input.eventType, JSON.stringify(input.body)],
    );
    if (!inserted[0]) return { duplicate: true, handled: false, reason: "" };

    const rows = input.providerPayment.order_id
      ? await sql<PaymentRecord>(
          `select * from payments where provider_order_id = $1 limit 1`,
          [input.providerPayment.order_id],
        )
      : [];
    const payment = rows[0];
    if (!payment) return { duplicate: false, handled: false, reason: "" };

    const reason =
      input.providerPayment.error_description ||
      input.providerPayment.status ||
      "The payment was not completed.";

    if (
      payment.status === "captured" ||
      payment.status === "refunded" ||
      payment.status === "partially_refunded"
    ) {
      return { duplicate: false, handled: true, reason };
    }

    await sql(
      `update payments
       set status = 'failed', provider_payment_id = coalesce(provider_payment_id, $2),
           failure_reason = $3, notes = notes || $4::jsonb, updated_at = now()
       where id = $1`,
      [
        payment.id,
        input.providerPayment.id,
        reason.slice(0, 500),
        JSON.stringify({ failedEventId: input.eventId }),
      ],
    );
    await sql(
      `update bookings set payment_status = 'failed', updated_at = now()
       where id = $1 and status = 'awaiting_payment'`,
      [payment.booking_id],
    );

    return {
      duplicate: false,
      handled: true,
      paymentId: payment.id,
      reason,
    };
  });
}

async function applyRefundWebhook(input: {
  body: WebhookBody;
  eventType: string;
  eventId: string;
  failed: boolean;
}): Promise<{
  duplicate: boolean;
  handled: boolean;
  notify?: () => Promise<void>;
}> {
  return withTransaction(async (sql) => {
    const inserted = await sql<{ id: number }>(
      `insert into payment_events (provider, event_id, event_type, payload)
       values ('razorpay', $1, $2, $3::jsonb)
       on conflict (provider, event_id) do nothing
       returning id`,
      [input.eventId, input.eventType, JSON.stringify(input.body)],
    );
    if (!inserted[0]) return { duplicate: true, handled: false };

    const entity = input.body.payload?.refund?.entity;
    if (!entity) return { duplicate: false, handled: false };

    const refundRows = await sql<{
      id: string;
      booking_id: string;
      payment_id: string;
      amount_paise: number;
      status: string;
    }>(
      `select id, booking_id, payment_id, amount_paise, status
       from refunds where provider_refund_id = $1 limit 1 for update`,
      [entity.id],
    );
    const refund = refundRows[0];
    if (!refund) return { duplicate: false, handled: false };

    if (input.failed) {
      if (refund.status === "processed") {
        return { duplicate: false, handled: true };
      }
      await sql(
        `update refunds
         set status = 'failed', failure_reason = $2, updated_at = now()
         where id = $1 and status <> 'processed'`,
        [refund.id, "Razorpay reported that the refund failed."],
      );
      return {
        duplicate: false,
        handled: true,
        notify: async () => {
          await notifyAdmins({
            type: "admin.refund_failed",
            title: "Refund failed at Razorpay",
            body: `Refund ${entity.id} for booking ${refund.booking_id} failed. Review it in the admin dashboard.`,
            link: "/admin/refunds",
            email: true,
          });
        },
      };
    }

    await sql(
      `update refunds
       set status = 'processed', processed_at = now(), failure_reason = null, updated_at = now()
       where id = $1 and status <> 'processed'`,
      [refund.id],
    );

    const totals = await sql<{ refunded: number }>(
      `select coalesce(sum(amount_paise), 0)::int as refunded
       from refunds where payment_id = $1 and status = 'processed'`,
      [refund.payment_id],
    );
    const paymentRows = await sql<{ id: string; amount_paise: number; booking_id: string }>(
      `select id, amount_paise, booking_id from payments where id = $1 for update`,
      [refund.payment_id],
    );
    const payment = paymentRows[0];
    if (payment) {
      const fullyRefunded = (totals[0]?.refunded ?? 0) >= payment.amount_paise;
      await sql(
        `update payments set status = $2, updated_at = now() where id = $1`,
        [payment.id, fullyRefunded ? "refunded" : "partially_refunded"],
      );
      await sql(
        `update bookings set payment_status = $2, updated_at = now() where id = $1`,
        [payment.booking_id, fullyRefunded ? "refunded" : "partially_refunded"],
      );
    }

    const bookingRows = await sql<{
      id: string;
      reference: string;
      customer_id: string;
    }>("select id, reference, customer_id from bookings where id = $1", [refund.booking_id]);
    const booking = bookingRows[0];

    return {
      duplicate: false,
      handled: true,
      notify: async () => {
        if (booking) {
          await notifyUser(booking.customer_id, {
            type: "refund.processed",
            title: `Refund processed for ${booking.reference}`,
            body: `Razorpay confirmed a refund of ${formatMoney(refund.amount_paise)}. It may take a few working days to appear in your account.`,
            link: `/dashboard/bookings/${booking.id}`,
            email: true,
          });
        }
      },
    };
  });
}

export async function handleRazorpayWebhook(input: {
  rawBody: string;
  signature: string;
  eventId?: string;
}): Promise<WebhookResult> {
  const config = getRazorpayConfig();
  if (!config?.webhookSecret) {
    return {
      ok: false,
      httpStatus: 503,
      message: "The payment webhook is not configured.",
    };
  }

  if (
    !verifyRazorpayWebhookSignature({
      body: input.rawBody,
      signature: input.signature,
      secret: config.webhookSecret,
    })
  ) {
    return { ok: false, httpStatus: 401, message: "Invalid webhook signature." };
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(input.rawBody) as WebhookBody;
  } catch {
    return { ok: false, httpStatus: 400, message: "Invalid webhook payload." };
  }

  const eventType = typeof body.event === "string" ? body.event : "";
  if (!eventType) {
    return { ok: false, httpStatus: 400, message: "Missing webhook event type." };
  }

  const eventId = webhookEventId(input.rawBody, body, input.eventId);
  let providerPayment = body.payload?.payment?.entity;

  if (
    (eventType === "order.paid" || eventType === "payment.captured" || eventType === "payment.authorized") &&
    !providerPayment
  ) {
    const orderId = body.payload?.order?.entity?.id;
    if (orderId) {
      try {
        const { client } = await getRazorpayClient();
        const list = await client.orders.fetchPayments(orderId);
        providerPayment =
          list.items.find((item) => item.status === "captured") ??
          list.items.find((item) => item.status === "authorized") ??
          undefined;
      } catch (error) {
        console.error("Webhook order payment lookup failed", error);
        return {
          ok: false,
          httpStatus: 500,
          message: "Could not read the order from the provider. Retry later.",
        };
      }
    }
  }

  try {
    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (!providerPayment) {
        return { ok: true, httpStatus: 200, message: "Event recorded without a payment entity." };
      }
      if (providerPayment.status === "authorized") {
        try {
          const { client } = await getRazorpayClient();
          providerPayment = await client.payments.capture(
            providerPayment.id,
            providerPayment.amount,
            providerPayment.currency,
          );
        } catch (error) {
          console.error("Webhook capture attempt failed", error);
        }
      }
      const result = await applyCapturedWebhook({
        body,
        eventType,
        providerPayment,
        eventId,
      });
      if (result.notify) await result.notify();
      return {
        ok: true,
        httpStatus: 200,
        message: result.duplicate
          ? "Duplicate event ignored."
          : result.handled
            ? "Payment event processed."
            : "Event recorded.",
        duplicate: result.duplicate,
        handled: result.handled,
      };
    }

    if (eventType === "payment.authorized") {
      if (!providerPayment) {
        return { ok: true, httpStatus: 200, message: "Event recorded without a payment entity." };
      }
      try {
        const { client } = await getRazorpayClient();
        providerPayment = await client.payments.capture(
          providerPayment.id,
          providerPayment.amount,
          providerPayment.currency,
        );
      } catch (error) {
        console.error("Webhook authorized capture failed", error);
        return {
          ok: false,
          httpStatus: 500,
          message: "Could not capture the authorized payment. Retry later.",
        };
      }
      const result = await applyCapturedWebhook({
        body,
        eventType,
        providerPayment,
        eventId,
      });
      if (result.notify) await result.notify();
      return {
        ok: true,
        httpStatus: 200,
        message: result.duplicate ? "Duplicate event ignored." : "Authorized payment captured.",
        duplicate: result.duplicate,
        handled: result.handled,
      };
    }

    if (eventType === "payment.failed") {
      if (!providerPayment) {
        return { ok: true, httpStatus: 200, message: "Event recorded without a payment entity." };
      }
      const result = await applyFailedWebhook({
        body,
        eventType,
        providerPayment,
        eventId,
      });
      if (result.paymentId) {
        const rows = await dbQuery<{ customer_id: string; reference: string; id: string }>(
          `select b.customer_id, b.reference, b.id
           from bookings b join payments p on p.booking_id = b.id
           where p.id = $1`,
          [result.paymentId],
        );
        if (rows[0]) {
          await notifyUser(rows[0].customer_id, {
            type: "payment.failed",
            title: "Payment did not complete",
            body: `No money has been confirmed for ${rows[0].reference}. The slot stays held until the payment window closes; you can try again.`,
            link: `/dashboard/bookings/${rows[0].id}`,
            email: true,
          });
        }
      }
      return {
        ok: true,
        httpStatus: 200,
        message: result.duplicate
          ? "Duplicate event ignored."
          : result.handled
            ? "Failed payment recorded."
            : "Event recorded.",
        duplicate: result.duplicate,
        handled: result.handled,
      };
    }

    if (eventType === "refund.processed" || eventType === "refund.failed") {
      const result = await applyRefundWebhook({
        body,
        eventType,
        eventId,
        failed: eventType === "refund.failed",
      });
      if (result.notify) await result.notify();
      return {
        ok: true,
        httpStatus: 200,
        message: result.duplicate
          ? "Duplicate event ignored."
          : result.handled
            ? "Refund event processed."
            : "Event recorded.",
        duplicate: result.duplicate,
        handled: result.handled,
      };
    }

    // Record unknown events for audit without acting on them.
    await dbQuery(
      `insert into payment_events (provider, event_id, event_type, payload)
       values ('razorpay', $1, $2, $3::jsonb)
       on conflict (provider, event_id) do nothing`,
      [eventId, eventType, JSON.stringify(body)],
    );
    return { ok: true, httpStatus: 200, message: "Event recorded.", handled: false };
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    return {
      ok: false,
      httpStatus: 500,
      message: "Webhook processing failed. Retry later.",
    };
  }
}

type RefundWithPayment = {
  id: string;
  booking_id: string;
  payment_id: string;
  amount_paise: number;
  status: "pending" | "initiated" | "processed" | "failed";
  provider_refund_id: string | null;
  reason: string | null;
  provider: "razorpay" | "demo";
  provider_payment_id: string | null;
  payment_status: PaymentTxnStatus;
  payment_amount_paise: number;
  booking_reference: string;
  customer_id: string;
  owner_id: string | null;
  venue_name: string;
};

export async function processRefund(input: {
  refundId: string;
  adminId: string;
  adminEmail: string;
}): Promise<RefundActionResult> {
  const rows = await dbQuery<RefundWithPayment>(
    `select r.id, r.booking_id, r.payment_id, r.amount_paise, r.status,
            r.provider_refund_id, r.reason,
            p.provider, p.provider_payment_id, p.status as payment_status,
            p.amount_paise as payment_amount_paise,
            b.reference as booking_reference, b.customer_id, v.owner_id,
            v.name as venue_name
     from refunds r
     join payments p on p.id = r.payment_id
     join bookings b on b.id = r.booking_id
     join venues v on v.id = b.venue_id
     where r.id = $1`,
    [input.refundId],
  );
  const refund = rows[0];
  if (!refund) return { ok: false, code: "not_found", error: "This refund could not be found." };

  if (refund.status === "processed") {
    return {
      ok: true,
      status: "processed",
      providerRefundId: refund.provider_refund_id ?? "",
      message: "This refund has already been processed.",
    };
  }
  if (refund.status === "initiated") {
    return {
      ok: true,
      status: "initiated",
      providerRefundId: refund.provider_refund_id ?? "",
      message: "This refund is already with the provider and awaiting confirmation.",
    };
  }
  if (refund.amount_paise <= 0) {
    return { ok: false, code: "invalid_state", error: "This refund has no amount to process." };
  }
  if (refund.amount_paise > refund.payment_amount_paise) {
    return { ok: false, code: "amount_mismatch", error: "The refund is larger than the captured payment." };
  }

  const reserved = await dbQuery<{ total: number }>(
    `select coalesce(sum(amount_paise), 0)::int as total
     from refunds
     where payment_id = $1 and id <> $2 and status in ('initiated', 'processed')`,
    [refund.payment_id, refund.id],
  );
  if ((reserved[0]?.total ?? 0) + refund.amount_paise > refund.payment_amount_paise) {
    return {
      ok: false,
      code: "amount_mismatch",
      error: "Other refunds already reserve more than the captured amount.",
    };
  }

  if (refund.provider === "demo") {
    const providerRefundId = `demo_rfnd_${randomUUID()}`;
    await withTransaction(async (sql) => {
      const updated = await sql<{ id: string }>(
        `update refunds
         set status = 'processed', provider_refund_id = $2, is_demo = true,
             processed_at = now(), initiated_at = coalesce(initiated_at, now()),
             initiated_by = coalesce(initiated_by, $3), failure_reason = null, updated_at = now()
         where id = $1 and status in ('pending', 'failed')
         returning id`,
        [refund.id, providerRefundId, input.adminId],
      );
      if (!updated[0]) throw new Error("Refund state changed.");
      const totals = await sql<{ refunded: number }>(
        `select coalesce(sum(amount_paise), 0)::int as refunded
         from refunds where payment_id = $1 and status = 'processed'`,
        [refund.payment_id],
      );
      const fullyRefunded = (totals[0]?.refunded ?? 0) >= refund.payment_amount_paise;
      await sql(
        `update payments set status = $2, updated_at = now() where id = $1`,
        [refund.payment_id, fullyRefunded ? "refunded" : "partially_refunded"],
      );
      await sql(
        `update bookings set payment_status = $2, updated_at = now() where id = $1`,
        [refund.booking_id, fullyRefunded ? "refunded" : "partially_refunded"],
      );
      await sql(
        `update cancellations set status = 'approved', reviewed_by = $2, reviewed_at = now(), updated_at = now()
         where booking_id = $1 and status = 'requested'`,
        [refund.booking_id, input.adminId],
      );
    });

    await notifyUser(refund.customer_id, {
      type: "refund.demo.processed",
      title: `Demo refund processed for ${refund.booking_reference}`,
      body: `A demo refund of ${formatMoney(refund.amount_paise)} was recorded. No real money moves in demo mode.`,
      link: `/dashboard/bookings/${refund.booking_id}`,
      email: false,
    });
    await recordAudit({
      actorId: input.adminId,
      actorEmail: input.adminEmail,
      action: "refund.demo.processed",
      entityType: "refund",
      entityId: refund.id,
      metadata: { bookingId: refund.booking_id, amountPaise: refund.amount_paise },
    });

    return {
      ok: true,
      status: "processed",
      providerRefundId,
      message: "Demo refund recorded. Demo mode does not move real money.",
    };
  }

  const config = getRazorpayConfig();
  if (!config) {
    return { ok: false, code: "not_configured", error: "Razorpay is not configured." };
  }
  if (!refund.provider_payment_id) {
    return {
      ok: false,
      code: "invalid_state",
      error: "The captured payment has no provider payment id. Reconcile the payment first.",
    };
  }
  if (
    refund.payment_status !== "captured" &&
    refund.payment_status !== "partially_refunded"
  ) {
    return {
      ok: false,
      code: "invalid_state",
      error: "Only a captured payment can be refunded.",
    };
  }

  let providerRefund;
  try {
    const { client } = await getRazorpayClient();
    providerRefund = await client.payments.refund(refund.provider_payment_id, {
      amount: refund.amount_paise,
      speed: "normal",
      notes: {
        bookingId: refund.booking_id,
        refundId: refund.id,
        bookingReference: refund.booking_reference,
      },
    });
  } catch (error) {
    const message = safeProviderMessage(error);
    await dbQuery(
      `update refunds
       set status = 'failed', failure_reason = $2, initiated_by = $3, updated_at = now()
       where id = $1 and status in ('pending', 'failed')`,
      [refund.id, message.slice(0, 500), input.adminId],
    );
    await notifyAdmins({
      type: "admin.refund_failed",
      title: "Refund could not be started",
      body: `Refund for ${refund.booking_reference} failed before Razorpay accepted it: ${message}`,
      link: "/admin/refunds",
      email: true,
    });
    await recordAudit({
      actorId: input.adminId,
      actorEmail: input.adminEmail,
      action: "refund.initiate.failed",
      entityType: "refund",
      entityId: refund.id,
      metadata: { message, bookingId: refund.booking_id },
    });
    return { ok: false, code: "provider_error", error: message };
  }

  await dbQuery(
    `update refunds
     set status = 'initiated', provider_refund_id = $2,
         initiated_at = now(), initiated_by = $3,
         failure_reason = null, updated_at = now()
     where id = $1 and status in ('pending', 'failed')`,
    [refund.id, providerRefund.id, input.adminId],
  );

  await notifyUser(refund.customer_id, {
    type: "refund.initiated",
    title: `Refund submitted for ${refund.booking_reference}`,
    body: `A refund of ${formatMoney(refund.amount_paise)} has been submitted to Razorpay. It is not complete until the provider confirms it.`,
    link: `/dashboard/bookings/${refund.booking_id}`,
    email: true,
  });
  await recordAudit({
    actorId: input.adminId,
    actorEmail: input.adminEmail,
    action: "refund.initiated",
    entityType: "refund",
    entityId: refund.id,
    metadata: {
      bookingId: refund.booking_id,
      amountPaise: refund.amount_paise,
      providerRefundId: providerRefund.id,
    },
  });

  return {
    ok: true,
    status: "initiated",
    providerRefundId: providerRefund.id,
    message:
      "Refund submitted to Razorpay. It will show as processed only after the provider confirms.",
  };
}

export async function syncRazorpayPayment(input: {
  bookingId: string;
  adminId: string;
  adminEmail: string;
}): Promise<PaymentConfirmationResult> {
  const config = getRazorpayConfig();
  if (!config) {
    return { ok: false, code: "not_configured", error: "Razorpay is not configured." };
  }

  const rows = await dbQuery<PaymentRecord>(
    `select * from payments
     where booking_id = $1 and provider = 'razorpay'
     order by created_at desc limit 1`,
    [input.bookingId],
  );
  const payment = rows[0];
  if (!payment?.provider_order_id) {
    return { ok: false, code: "not_found", error: "No Razorpay order exists for this booking." };
  }

  try {
    const { client } = await getRazorpayClient();
    const list = await client.orders.fetchPayments(payment.provider_order_id);
    const providerPayment =
      list.items.find((item) => item.status === "captured") ??
      list.items.find((item) => item.status === "authorized") ??
      list.items.find((item) => item.status === "failed");
    if (!providerPayment) {
      return { ok: false, code: "provider_error", error: "Razorpay has no payment for this order yet." };
    }

    if (providerPayment.status === "failed") {
      await markPaymentFailed({
        paymentId: payment.id,
        providerPaymentId: providerPayment.id,
        reason: providerPayment.error_description || "Provider reports the payment failed.",
        providerSnapshot: providerPayment as unknown as Record<string, unknown>,
      });
      return {
        ok: false,
        code: "provider_error",
        error: "Razorpay reports this payment as failed.",
      };
    }

    const captured = await withTransaction(async (sql) =>
      confirmBookingAfterCapture({
        sql,
        payment,
        providerPaymentId: providerPayment.id,
        method: providerPayment.method ?? null,
        note: "Reconciled from the admin dashboard",
        providerSnapshot: providerPayment as unknown as Record<string, unknown>,
      }),
    );

    await notifyCapture({
      booking: captured.booking,
      changed: captured.changed,
      late: captured.late,
      amountPaise: payment.amount_paise,
    });
    await recordAudit({
      actorId: input.adminId,
      actorEmail: input.adminEmail,
      action: "payment.reconciled",
      entityType: "payment",
      entityId: payment.id,
      metadata: { providerPaymentId: providerPayment.id },
    });

    if (captured.late) {
      return {
        ok: false,
        code: "expired",
        error: "Payment is captured, but the booking is closed. A refund needs review.",
      };
    }
    return {
      ok: true,
      status: captured.booking.status,
      paymentStatus: "paid",
      reference: captured.booking.reference,
      message: "Payment reconciled with Razorpay.",
      idempotent: !captured.changed,
    };
  } catch (error) {
    console.error("Payment reconciliation failed", error);
    return { ok: false, code: "provider_error", error: safeProviderMessage(error) };
  }
}

export async function listPaymentsForBooking(bookingId: string): Promise<PaymentRecord[]> {
  return dbQuery<PaymentRecord>(
    "select * from payments where booking_id = $1 order by created_at desc",
    [bookingId],
  );
}

export function paymentDisplayMode(): {
  mode: "razorpay" | "demo" | "unavailable";
  testMode: boolean;
} {
  const config = getRazorpayConfig();
  if (config) return { mode: "razorpay", testMode: config.testMode };
  if (demoPaymentsEnabled()) return { mode: "demo", testMode: true };
  return { mode: "unavailable", testMode: false };
}
