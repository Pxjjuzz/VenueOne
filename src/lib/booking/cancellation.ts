import "server-only";

import { dbQuery, withTransaction, type Sql } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { formatMoney } from "@/lib/format";
import { renderCancellationEmail } from "@/lib/email/templates";
import { formatIstDateLong } from "@/lib/time";
import {
  DEFAULT_CANCELLATION_POLICY,
  calculateRefund,
  parseCancellationPolicy,
} from "@/lib/policies";
import type { BookingStatus, PaymentStatus } from "@/lib/types";

export type CancellationRequestResult =
  | {
      ok: true;
      mode: "requested";
      message: string;
      refundAmountPaise: number;
    }
  | { ok: false; code: "not_found" | "forbidden" | "invalid_state"; error: string };

type BookingForCancellation = {
  id: string;
  reference: string;
  customer_id: string;
  venue_id: string;
  owner_id: string | null;
  venue_name: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  starts_at: Date;
  total_paise: number;
  cancellation_policy_snapshot: Record<string, unknown>;
};

async function loadBooking(
  sql: Sql,
  bookingId: string,
  customerId: string,
): Promise<BookingForCancellation | null> {
  const rows = await sql<BookingForCancellation>(
    `select b.id, b.reference, b.customer_id, b.venue_id, v.owner_id,
            v.name as venue_name, b.status, b.payment_status, b.starts_at,
            b.total_paise, b.cancellation_policy_snapshot
     from bookings b join venues v on v.id = b.venue_id
     where b.id = $1 and b.customer_id = $2
     for update of b`,
    [bookingId, customerId],
  );
  return rows[0] ?? null;
}

export async function requestCancellation(input: {
  bookingId: string;
  customerId: string;
  reason: string;
}): Promise<CancellationRequestResult> {
  await dbQuery("select refresh_booking_states()");
  const now = new Date();

  const result = await withTransaction(async (sql) => {
    const booking = await loadBooking(sql, input.bookingId, input.customerId);
    if (!booking) {
      return { kind: "error" as const, code: "not_found" as const, error: "This booking could not be found." };
    }

    const existing = await sql<{ id: string; status: string }>(
      "select id, status from cancellations where booking_id = $1",
      [booking.id],
    );
    if (existing[0] && existing[0].status === "requested") {
      return {
        kind: "error" as const,
        code: "invalid_state" as const,
        error: "A cancellation request is already awaiting review.",
      };
    }
    if (existing[0] && existing[0].status === "approved") {
      return { kind: "error" as const, code: "invalid_state" as const, error: "This booking is already cancelled." };
    }

    if (booking.status !== "confirmed") {
      return {
        kind: "error" as const,
        code: "invalid_state" as const,
        error:
          "Cancellation opens once a booking is confirmed. A pending or unpaid booking cannot be cancelled here.",
      };
    }
    if (booking.starts_at.getTime() <= now.getTime()) {
      return {
        kind: "error" as const,
        code: "invalid_state" as const,
        error: "This booking has already started and cannot be cancelled online.",
      };
    }

    const policy = parseCancellationPolicy(
      booking.cancellation_policy_snapshot ?? DEFAULT_CANCELLATION_POLICY,
    );
    const decision = calculateRefund({
      policy,
      startsAt: booking.starts_at,
      now,
      totalPaise: booking.total_paise,
    });

    await sql(
      `insert into cancellations (
         booking_id, requested_by, reason, status, refund_eligible,
         refund_percent, refund_amount_paise, policy_snapshot
       ) values ($1, $2, $3, 'requested', $4, $5, $6, $7::jsonb)
       on conflict (booking_id) do update
       set requested_by = excluded.requested_by,
           reason = excluded.reason,
           status = 'requested',
           refund_eligible = excluded.refund_eligible,
           refund_percent = excluded.refund_percent,
           refund_amount_paise = excluded.refund_amount_paise,
           policy_snapshot = excluded.policy_snapshot,
           admin_note = null,
           reviewed_by = null,
           reviewed_at = null,
           updated_at = now()`,
      [
        booking.id,
        input.customerId,
        input.reason,
        decision.allowed && decision.amountPaise > 0,
        decision.percent,
        decision.amountPaise,
        JSON.stringify({
          ...policy,
          decisionReason: decision.reason,
          hoursBeforeStart: decision.hoursBeforeStart,
        }),
      ],
    );

    await sql(
      `update bookings set cancellation_reason = $2, updated_at = now() where id = $1`,
      [booking.id, input.reason],
    );

    return {
      kind: "requested" as const,
      booking,
      refundAmountPaise: decision.allowed ? decision.amountPaise : 0,
      refundReason: decision.reason,
    };
  });

  if (result.kind === "error") {
    return { ok: false, code: result.code, error: result.error };
  }

  const cancelMail = renderCancellationEmail({
    reference: result.booking.reference,
    venueName: result.booking.venue_name,
    dateStr: formatIstDateLong(result.booking.starts_at),
    status: "requested",
    refundAmountPaise: result.refundAmountPaise,
    reason: input.reason,
    bookingId: result.booking.id,
  });

  await notifyUser(input.customerId, {
    type: "cancellation.requested",
    title: cancelMail.subject,
    body: `Your cancellation request for ${result.booking.reference} at ${result.booking.venue_name} has been received. Maximum refund under saved policy: ${formatMoney(result.refundAmountPaise)}.`,
    link: `/dashboard/bookings/${result.booking.id}`,
    email: true,
    emailSubject: cancelMail.subject,
    emailHtml: cancelMail.html,
    emailText: cancelMail.text,
  });

  await notifyAdmins({
    type: "admin.cancellation_requested",
    title: "Cancellation request needs review",
    body: `${result.booking.reference} (${result.booking.venue_name}) has a cancellation request. Calculated maximum refund: ${formatMoney(result.refundAmountPaise)}.`,
    link: "/admin/cancellations",
    email: true,
  });
  if (result.booking.owner_id) {
    await notifyUser(result.booking.owner_id, {
      type: "owner.cancellation_requested",
      title: "Cancellation requested",
      body: `${result.booking.reference} has a cancellation request awaiting platform review.`,
      link: "/owner/bookings",
      email: true,
    });
  }
  await recordAudit({
    actorId: input.customerId,
    action: "cancellation.requested",
    entityType: "booking",
    entityId: result.booking.id,
    metadata: {
      reference: result.booking.reference,
      refundAmountPaise: result.refundAmountPaise,
      reason: input.reason,
    },
  });

  return {
    ok: true,
    mode: "requested",
    message:
      result.refundAmountPaise > 0
        ? "Cancellation requested. A refund is not confirmed until an administrator approves it and the provider processes it."
        : "Cancellation requested. This booking is not eligible for a refund under its saved policy.",
    refundAmountPaise: result.refundAmountPaise,
  };
}

export type CancellationReviewResult =
  | { ok: true; message: string; refundId?: string }
  | { ok: false; code: "not_found" | "invalid_state"; error: string };

export async function reviewCancellation(input: {
  cancellationId: string;
  adminId: string;
  adminEmail: string;
  decision: "approve" | "reject";
  note: string;
}): Promise<CancellationReviewResult> {
  const result = await withTransaction(async (sql) => {
    const rows = await sql<{
      id: string;
      booking_id: string;
      requested_by: string;
      status: string;
      refund_eligible: boolean;
      refund_percent: number;
      refund_amount_paise: number;
      reason: string;
      booking_reference: string;
      booking_status: BookingStatus;
      total_paise: number;
      customer_id: string;
      owner_id: string | null;
      venue_name: string;
      starts_at: Date;
    }>(
      `select c.id, c.booking_id, c.requested_by, c.status, c.refund_eligible,
              c.refund_percent, c.refund_amount_paise, c.reason,
              b.reference as booking_reference, b.status as booking_status,
              b.total_paise, b.customer_id, b.starts_at, v.owner_id, v.name as venue_name
       from cancellations c
       join bookings b on b.id = c.booking_id
       join venues v on v.id = b.venue_id
       where c.id = $1
       for update of c`,
      [input.cancellationId],
    );
    const cancellation = rows[0];
    if (!cancellation) {
      return { kind: "error" as const, code: "not_found" as const, error: "This cancellation could not be found." };
    }
    if (cancellation.status !== "requested") {
      return {
        kind: "error" as const,
        code: "invalid_state" as const,
        error: "This cancellation has already been reviewed.",
      };
    }

    if (input.decision === "reject") {
      await sql(
        `update cancellations
         set status = 'rejected', reviewed_by = $2, reviewed_at = now(),
             admin_note = $3, updated_at = now()
         where id = $1`,
        [cancellation.id, input.adminId, input.note],
      );
      await sql(
        `update bookings set cancellation_reason = null, updated_at = now() where id = $1`,
        [cancellation.booking_id],
      );
      return { kind: "rejected" as const, cancellation };
    }

    await sql(
      `update cancellations
       set status = 'approved', reviewed_by = $2, reviewed_at = now(),
           admin_note = $3, updated_at = now()
       where id = $1`,
      [cancellation.id, input.adminId, input.note],
    );
    await sql(
      `update bookings
       set status = 'cancelled', cancelled_at = now(), cancelled_by = $2,
           hold_expires_at = null, updated_at = now()
       where id = $1`,
      [cancellation.booking_id, input.adminId],
    );
    await sql("delete from booking_slots where booking_id = $1", [cancellation.booking_id]);
    await sql(
      `insert into booking_status_history (booking_id, from_status, to_status, actor_id, note)
       values ($1, $2, 'cancelled', $3, $4)`,
      [
        cancellation.booking_id,
        cancellation.booking_status,
        input.adminId,
        input.note || "Cancellation approved by administrator",
      ],
    );

    let refundId: string | undefined;
    if (cancellation.refund_amount_paise > 0) {
      const payments = await sql<{ id: string }>(
        `select id from payments
         where booking_id = $1 and status in ('captured', 'partially_refunded')
         order by created_at desc limit 1`,
        [cancellation.booking_id],
      );
      if (payments[0]) {
        const existingRefund = await sql<{ id: string }>(
          `select id from refunds where booking_id = $1 and status in ('pending', 'initiated') limit 1`,
          [cancellation.booking_id],
        );
        if (existingRefund[0]) {
          refundId = existingRefund[0].id;
        } else {
          const inserted = await sql<{ id: string }>(
            `insert into refunds (
               payment_id, booking_id, amount_paise, status, reason, is_demo
             ) values ($1, $2, $3, 'pending', $4, false)
             returning id`,
            [
              payments[0].id,
              cancellation.booking_id,
              Math.min(cancellation.refund_amount_paise, cancellation.total_paise),
              `Cancellation approved: ${cancellation.reason}`.slice(0, 500),
            ],
          );
          refundId = inserted[0]?.id;
        }
      }
    }

    return { kind: "approved" as const, cancellation, refundId };
  });

  if (result.kind === "error") {
    return { ok: false, code: result.code, error: result.error };
  }

  if (result.kind === "rejected") {
    const rejectedMail = renderCancellationEmail({
      reference: result.cancellation.booking_reference,
      venueName: result.cancellation.venue_name,
      dateStr: formatIstDateLong(result.cancellation.starts_at),
      status: "rejected",
      note: input.note,
      bookingId: result.cancellation.booking_id,
    });

    await notifyUser(result.cancellation.customer_id, {
      type: "cancellation.rejected",
      title: rejectedMail.subject,
      body: input.note
        ? `An administrator did not approve this cancellation: ${input.note}. Your booking remains confirmed.`
        : "An administrator did not approve this cancellation. Your booking remains confirmed.",
      link: `/dashboard/bookings/${result.cancellation.booking_id}`,
      email: true,
      emailSubject: rejectedMail.subject,
      emailHtml: rejectedMail.html,
      emailText: rejectedMail.text,
    });
    await recordAudit({
      actorId: input.adminId,
      actorEmail: input.adminEmail,
      action: "cancellation.rejected",
      entityType: "cancellation",
      entityId: result.cancellation.id,
      metadata: { bookingId: result.cancellation.booking_id, note: input.note },
    });
    return { ok: true, message: "Cancellation rejected. The booking remains confirmed." };
  }

  const approvedMail = renderCancellationEmail({
    reference: result.cancellation.booking_reference,
    venueName: result.cancellation.venue_name,
    dateStr: formatIstDateLong(result.cancellation.starts_at),
    status: "approved",
    refundAmountPaise: result.cancellation.refund_amount_paise,
    bookingId: result.cancellation.booking_id,
  });

  await notifyUser(result.cancellation.customer_id, {
    type: "cancellation.approved",
    title: approvedMail.subject,
    body:
      result.refundId
        ? `The booking is cancelled. A refund of ${formatMoney(result.cancellation.refund_amount_paise)} is queued for administrator processing. It is not complete until the payment provider confirms it.`
        : "The booking is cancelled. No refund is due under the saved cancellation policy.",
    link: `/dashboard/bookings/${result.cancellation.booking_id}`,
    email: true,
    emailSubject: approvedMail.subject,
    emailHtml: approvedMail.html,
    emailText: approvedMail.text,
  });
  if (result.cancellation.owner_id) {
    await notifyUser(result.cancellation.owner_id, {
      type: "owner.cancellation.approved",
      title: "Cancellation approved",
      body: `${result.cancellation.booking_reference} was cancelled by the platform. The slot has been released.`,
      link: "/owner/bookings",
      email: true,
    });
  }
  await recordAudit({
    actorId: input.adminId,
    actorEmail: input.adminEmail,
    action: "cancellation.approved",
    entityType: "cancellation",
    entityId: result.cancellation.id,
    metadata: {
      bookingId: result.cancellation.booking_id,
      refundId: result.refundId ?? null,
      refundAmountPaise: result.cancellation.refund_amount_paise,
      note: input.note,
    },
  });

  return {
    ok: true,
    message: result.refundId
      ? "Cancellation approved. A refund is queued but not yet processed."
      : "Cancellation approved. No refund is due.",
    refundId: result.refundId,
  };
}

export async function withdrawCancellation(input: {
  cancellationId: string;
  customerId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const rows = await dbQuery<{ id: string; booking_id: string; status: string; requested_by: string }>(
    "select id, booking_id, status, requested_by from cancellations where id = $1",
    [input.cancellationId],
  );
  const cancellation = rows[0];
  if (!cancellation || cancellation.requested_by !== input.customerId) {
    return { ok: false, error: "This cancellation could not be found." };
  }
  if (cancellation.status !== "requested") {
    return { ok: false, error: "This cancellation can no longer be withdrawn." };
  }
  await withTransaction(async (sql) => {
    await sql(
      `update cancellations set status = 'withdrawn', updated_at = now() where id = $1`,
      [cancellation.id],
    );
    await sql(
      `update bookings set cancellation_reason = null, updated_at = now() where id = $1`,
      [cancellation.booking_id],
    );
  });
  await recordAudit({
    actorId: input.customerId,
    action: "cancellation.withdrawn",
    entityType: "cancellation",
    entityId: cancellation.id,
    metadata: { bookingId: cancellation.booking_id },
  });
  return { ok: true };
}
