import "server-only";

import { dbQuery, withTransaction } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { formatIstDateTime } from "@/lib/time";
import type { BookingStatus } from "@/lib/types";

export type OwnerDecisionResult =
  | { ok: true; status: BookingStatus; message: string; paymentDeadline?: string }
  | { ok: false; code: "not_found" | "invalid_state"; error: string };

export async function decideOwnerBooking(input: {
  bookingId: string;
  ownerId: string;
  decision: "approve" | "reject";
  note: string;
}): Promise<OwnerDecisionResult> {
  await dbQuery("select refresh_booking_states()");

  const result = await withTransaction(async (sql) => {
    const rows = await sql<{
      id: string;
      reference: string;
      customer_id: string;
      venue_id: string;
      status: BookingStatus;
      payment_window_minutes: number;
      venue_name: string;
      starts_at: Date;
      total_paise: number;
    }>(
      `select b.id, b.reference, b.customer_id, b.venue_id, b.status,
              v.payment_window_minutes, v.name as venue_name, b.starts_at, b.total_paise
       from bookings b
       join venues v on v.id = b.venue_id
       where b.id = $1 and v.owner_id = $2
       for update of b`,
      [input.bookingId, input.ownerId],
    );
    const booking = rows[0];
    if (!booking) {
      return { kind: "error" as const, code: "not_found" as const, error: "This booking could not be found." };
    }
    if (booking.status !== "pending_owner_approval") {
      return {
        kind: "error" as const,
        code: "invalid_state" as const,
        error: "This request is no longer awaiting an owner decision.",
      };
    }

    if (input.decision === "approve") {
      const holdExpiresAt = new Date(Date.now() + booking.payment_window_minutes * 60_000);
      await sql(
        `update bookings
         set status = 'awaiting_payment', decided_by = $2, decided_at = now(),
             decision_note = $3, hold_expires_at = $4, updated_at = now()
         where id = $1`,
        [booking.id, input.ownerId, input.note || null, holdExpiresAt],
      );
      await sql(
        `insert into booking_status_history (booking_id, from_status, to_status, actor_id, note)
         values ($1, 'pending_owner_approval', 'awaiting_payment', $2, $3)`,
        [booking.id, input.ownerId, input.note || "Approved by venue owner"],
      );
      return {
        kind: "approved" as const,
        booking,
        holdExpiresAt,
      };
    }

    await sql(
      `update bookings
       set status = 'rejected', decided_by = $2, decided_at = now(),
           decision_note = $3, hold_expires_at = null, updated_at = now()
       where id = $1`,
      [booking.id, input.ownerId, input.note || "The venue could not accept this request."],
    );
    await sql("delete from booking_slots where booking_id = $1", [booking.id]);
    await sql(
      `insert into booking_status_history (booking_id, from_status, to_status, actor_id, note)
       values ($1, 'pending_owner_approval', 'rejected', $2, $3)`,
      [booking.id, input.ownerId, input.note || "Rejected by venue owner"],
    );
    return { kind: "rejected" as const, booking };
  });

  if (result.kind === "error") {
    return { ok: false, code: result.code, error: result.error };
  }

  if (result.kind === "approved") {
    await notifyUser(result.booking.customer_id, {
      type: "booking.approved",
      title: `Your request for ${result.booking.reference} was accepted`,
      body: `${result.booking.venue_name} accepted your booking request. Complete payment by ${formatIstDateTime(result.holdExpiresAt)} to confirm the slot.`,
      link: `/dashboard/bookings/${result.booking.id}`,
      email: true,
    });
    await recordAudit({
      actorId: input.ownerId,
      action: "booking.owner.approved",
      entityType: "booking",
      entityId: result.booking.id,
      metadata: { reference: result.booking.reference, note: input.note },
    });
    return {
      ok: true,
      status: "awaiting_payment",
      message: "Request approved. The customer can now pay within the payment window.",
      paymentDeadline: result.holdExpiresAt.toISOString(),
    };
  }

  await notifyUser(result.booking.customer_id, {
    type: "booking.rejected",
    title: `Request for ${result.booking.reference} was not accepted`,
    body: input.note
      ? `${result.booking.venue_name} could not accept this request: ${input.note}. No payment is due.`
      : `${result.booking.venue_name} could not accept this request. No payment is due.`,
    link: `/dashboard/bookings/${result.booking.id}`,
    email: true,
  });
  await recordAudit({
    actorId: input.ownerId,
    action: "booking.owner.rejected",
    entityType: "booking",
    entityId: result.booking.id,
    metadata: { reference: result.booking.reference, note: input.note },
  });

  return {
    ok: true,
    status: "rejected",
    message: "Request rejected and the slot released.",
  };
}
