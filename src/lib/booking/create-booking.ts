import "server-only";

import { getDb, isUniqueViolation, type Database } from "@/lib/db";
import {
  DEFAULT_CANCELLATION_POLICY,
  computeTotals,
  parseCancellationPolicy,
} from "@/lib/policies";
import { createBookingReference } from "@/lib/reference";
import { notifyUser, notifyUsers } from "@/lib/notifications";
import type {
  BookingPolicy,
  BookingStatus,
  PricingSlot,
  VenueCategory,
  VenuePricingRow,
} from "@/lib/types";
import {
  buildHourGrid,
  resolveDayHours,
  type DayHours,
  type Interval,
} from "./slots";
import { resolveBookingSelection } from "./selection";
import type { CreateBookingInput } from "@/lib/validation";
import { addDaysToDateKey, formatIstDateLong, formatTimeRange, istDateTime } from "@/lib/time";
import { renderBookingCreatedEmail } from "@/lib/email/templates";

type VenueForBooking = {
  id: string;
  owner_id: string | null;
  name: string;
  city: string;
  category: VenueCategory;
  capacity: number | null;
  booking_policy: BookingPolicy;
  payment_window_minutes: number;
  accepting_bookings: boolean;
  status: string;
  attributes: Record<string, unknown>;
};

type PlatformRows = { key: string; value: unknown };

type BookingInput = CreateBookingInput & {
  customerId: string;
  customerEmail: string;
  customerName?: string | null;
  now?: Date;
};

export type CreateBookingResult =
  | {
      ok: true;
      bookingId: string;
      reference: string;
      status: BookingStatus;
      totalPaise: number;
      paymentDeadline: string | null;
    }
  | {
      ok: false;
      code: "not_found" | "unavailable" | "invalid" | "conflict" | "inactive";
      error: string;
    };

class BookingError extends Error {
  code: "not_found" | "unavailable" | "invalid" | "conflict" | "inactive";
  constructor(
    code: "not_found" | "unavailable" | "invalid" | "conflict" | "inactive",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

function mapHours(
  rows: { weekday: number; opens_at: string; closes_at: string; is_closed: boolean }[],
): DayHours[] {
  return rows.map((row) => ({
    weekday: row.weekday,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    isClosed: row.is_closed,
  }));
}

function settingsValue(rows: PlatformRows[], key: string, fallback: number): number {
  const row = rows.find((item) => item.key === key);
  const value = typeof row?.value === "number" ? row.value : Number(row?.value);
  return Number.isFinite(value) ? value : fallback;
}

type ExistingBooking = {
  id: string;
  reference: string;
  status: BookingStatus;
  total_paise: number;
  hold_expires_at: Date | null;
};

function existingResult(row: ExistingBooking): CreateBookingResult {
  return {
    ok: true,
    bookingId: row.id,
    reference: row.reference,
    status: row.status,
    totalPaise: row.total_paise,
    paymentDeadline: row.hold_expires_at
      ? new Date(row.hold_expires_at).toISOString()
      : null,
  };
}

export async function createBooking(
  input: BookingInput,
): Promise<CreateBookingResult> {
  const db = await getDb();
  return createBookingWithDatabase(db, input);
}

export async function createBookingWithDatabase(
  db: Database,
  input: BookingInput,
): Promise<CreateBookingResult> {
  const now = input.now ?? new Date();

  let created:
    | {
        id: string;
        reference: string;
        status: BookingStatus;
        totalPaise: number;
        holdExpiresAt: Date;
        ownerId: string | null;
        venueName: string;
        venueCity: string | null;
        interval: Interval | null;
        slotType: string;
        isNew: boolean;
      }
    | null = null;

  try {
    created = await db.transaction(async (tx) => {
      await tx("select refresh_booking_states()");
      await tx("select pg_advisory_xact_lock(hashtext($1))", [input.venueId]);

      const duplicate = await tx<ExistingBooking>(
        `select id, reference, status, total_paise, hold_expires_at
         from bookings where customer_id = $1 and idempotency_key = $2`,
        [input.customerId, input.idempotencyKey],
      );
      if (duplicate[0]) {
        return {
          id: duplicate[0].id,
          reference: duplicate[0].reference,
          status: duplicate[0].status,
          totalPaise: duplicate[0].total_paise,
          holdExpiresAt: duplicate[0].hold_expires_at
            ? new Date(duplicate[0].hold_expires_at)
            : now,
          ownerId: null,
          venueName: "",
          venueCity: null as string | null,
          interval: null as Interval | null,
          slotType: "",
          isNew: false,
        };
      }

      const venues = await tx<VenueForBooking>(
        `select id, owner_id, name, city, category, capacity, booking_policy,
                payment_window_minutes, accepting_bookings, status, attributes
         from venues where id = $1 and status = 'approved'`,
        [input.venueId],
      );
      const venue = venues[0];
      if (!venue) {
        throw new BookingError("not_found", "This venue is not available for booking.");
      }
      if (!venue.accepting_bookings) {
        throw new BookingError(
          "inactive",
          "This venue is not accepting bookings right now.",
        );
      }

      const dayStart = istDateTime(input.date, "00:00");
      const dayEnd = addDaysToDateKey(input.date, 1);

      const [hourRows, pricingRows, blockRows, bookedRows, settingsRows] =
        await (async () => {
          const hours = await tx<{
            weekday: number;
            opens_at: string;
            closes_at: string;
            is_closed: boolean;
          }>(
            `select weekday, to_char(opens_at, 'HH24:MI') as opens_at,
                    to_char(closes_at, 'HH24:MI') as closes_at, is_closed
             from venue_hours where venue_id = $1`,
            [input.venueId],
          );
          const pricing = await tx<VenuePricingRow>(
            "select * from venue_pricing where venue_id = $1",
            [input.venueId],
          );
          const blocks = await tx<{ starts_at: Date; ends_at: Date }>(
            `select starts_at, ends_at from venue_blocks
             where venue_id = $1 and starts_at < $2 and ends_at > $3`,
            [input.venueId, dayEnd, dayStart],
          );
          const booked = await tx<{ slot_start: Date; slot_end: Date }>(
            `select slot_start, slot_end from booking_slots
             where venue_id = $1 and slot_start >= $2 and slot_start < $3`,
            [input.venueId, dayStart, dayEnd],
          );
          const settings = await tx<PlatformRows>(
            "select key, value from platform_settings",
          );
          return [hours, pricing, blocks, booked, settings] as const;
        })();

      const dayHours = resolveDayHours(mapHours(hourRows), input.date);
      if (!dayHours) {
        throw new BookingError("unavailable", "The venue is closed on that date.");
      }

      const grid = buildHourGrid(input.date, dayHours);
      if (grid.length === 0) {
        throw new BookingError(
          "unavailable",
          "The venue has no operating hours on that date.",
        );
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
        dayHours,
        pricing,
        blocks,
        booked,
      });
      if (!selection.ok) {
        throw new BookingError(selection.code, selection.error);
      }

      const { interval, slotType, unitPricePaise: unitPrice, subtotalPaise: subtotal, bookedHours } =
        selection;

      const ownerResponseHours = settingsValue(settingsRows, "owner_response_hours", 48);
      const platformFeePaise = settingsValue(settingsRows, "platform_fee_paise", 0);
      const taxPercent = settingsValue(settingsRows, "tax_percent", 0);
      const cancellationPolicy = parseCancellationPolicy(
        settingsRows.find((row) => row.key === "cancellation_policy")?.value ??
          DEFAULT_CANCELLATION_POLICY,
      );

      const totals = computeTotals({
        subtotalPaise: subtotal,
        platformFeePaise,
        taxPercent,
      });

      const isInstant = venue.booking_policy === "instant";
      const status: BookingStatus = isInstant
        ? "awaiting_payment"
        : "pending_owner_approval";
      const holdMinutes = isInstant
        ? venue.payment_window_minutes
        : Math.round(ownerResponseHours * 60);
      const holdExpiresAt = new Date(now.getTime() + holdMinutes * 60_000);
      const reference = createBookingReference();

      const inserted = await tx<{ id: string }>(
        `insert into bookings (
          reference, venue_id, customer_id, slot_type, starts_at, ends_at,
          guest_count, event_type, notes, status, subtotal_paise, fee_paise,
          tax_paise, total_paise, hold_expires_at, pricing_snapshot,
          cancellation_policy_snapshot, idempotency_key
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16::jsonb, $17::jsonb, $18
        ) returning id`,
        [
          reference,
          venue.id,
          input.customerId,
          slotType,
          interval.start,
          interval.end,
          input.guestCount ?? null,
          input.eventType?.trim() || null,
          input.notes?.trim() || null,
          status,
          totals.subtotalPaise,
          totals.feePaise,
          totals.taxPaise,
          totals.totalPaise,
          holdExpiresAt,
          JSON.stringify({
            slotType,
            hours: bookedHours,
            unitPricePaise: unitPrice,
            subtotalPaise: totals.subtotalPaise,
            feePaise: totals.feePaise,
            taxPercent,
            taxPaise: totals.taxPaise,
            totalPaise: totals.totalPaise,
            interval: {
              start: interval.start.toISOString(),
              end: interval.end.toISOString(),
            },
          }),
          JSON.stringify(cancellationPolicy),
          input.idempotencyKey,
        ],
      );

      const bookingId = inserted[0].id;
      const occupied = grid.filter(
        (slot) =>
          slot.start.getTime() >= interval.start.getTime() &&
          slot.end.getTime() <= interval.end.getTime(),
      );

      for (const slot of occupied) {
        await tx(
          `insert into booking_slots (booking_id, venue_id, slot_start, slot_end)
           values ($1, $2, $3, $4)`,
          [bookingId, venue.id, slot.start, slot.end],
        );
      }

      await tx(
        `insert into booking_status_history (booking_id, from_status, to_status, actor_id, note)
         values ($1, null, $2, $3, $4)`,
        [bookingId, status, input.customerId, "Booking created"],
      );

      return {
        id: bookingId,
        reference,
        status,
        totalPaise: totals.totalPaise,
        holdExpiresAt,
        ownerId: venue.owner_id,
        venueName: venue.name,
        venueCity: venue.city,
        interval,
        slotType,
        isNew: true,
      };
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, code: error.code, error: error.message };
    }
    if (isUniqueViolation(error)) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("idempotency")) {
        const retry = await db.sql<ExistingBooking>(
          `select id, reference, status, total_paise, hold_expires_at
           from bookings where customer_id = $1 and idempotency_key = $2`,
          [input.customerId, input.idempotencyKey],
        );
        if (retry[0]) return existingResult(retry[0]);
      }
      return {
        ok: false,
        code: "conflict",
        error: "That time was just reserved by someone else. Choose another slot.",
      };
    }
    console.error("Booking creation failed", error);
    return {
      ok: false,
      code: "invalid",
      error: "The booking could not be created. Please try again.",
    };
  }

  if (!created) {
    return { ok: false, code: "invalid", error: "The booking could not be created." };
  }

  if (!created.isNew) {
    return {
      ok: true,
      bookingId: created.id,
      reference: created.reference,
      status: created.status,
      totalPaise: created.totalPaise,
      paymentDeadline: created.holdExpiresAt.toISOString(),
    };
  }

  const action =
    created.status === "pending_owner_approval"
      ? "Your request is with the venue owner"
      : "Complete payment to confirm";

  const dateStr = created.interval ? formatIstDateLong(created.interval.start) : "";
  const timeStr = created.interval
    ? formatTimeRange(created.interval.start, created.interval.end)
    : "";
  const bookingMail = renderBookingCreatedEmail({
    customerName: input.customerName,
    reference: created.reference,
    venueName: created.venueName || "Venue",
    venueCity: created.venueCity,
    slotLabel: created.slotType || "Standard",
    dateStr,
    timeStr,
    totalPaise: created.totalPaise,
    status:
      created.status === "pending_owner_approval"
        ? "pending_owner_approval"
        : "awaiting_payment",
    bookingId: created.id,
  });

  await notifyUser(input.customerId, {
    type:
      created.status === "pending_owner_approval"
        ? "booking.requested"
        : "booking.awaiting_payment",
    title: bookingMail.subject,
    body:
      created.status === "pending_owner_approval"
        ? `${created.venueName || "The venue"} has received your request. We will notify you when the owner responds.`
        : `Your slot at ${created.venueName || "the venue"} is held until payment is completed.`,
    link: `/dashboard/bookings/${created.id}`,
    email: true,
    emailSubject: bookingMail.subject,
    emailHtml: bookingMail.html,
    emailText: bookingMail.text,
  });

  if (created.ownerId) {
    await notifyUsers([created.ownerId], {
      type:
        created.status === "pending_owner_approval"
          ? "owner.booking_requested"
          : "owner.booking_awaiting_payment",
      title:
        created.status === "pending_owner_approval"
          ? "New booking request"
          : "New booking awaiting payment",
      body: `${created.venueName || "Venue"}: ${created.reference}. Review it in your owner dashboard.`,
      link: "/owner/bookings",
      email: true,
    });
  }

  return {
    ok: true,
    bookingId: created.id,
    reference: created.reference,
    status: created.status,
    totalPaise: created.totalPaise,
    paymentDeadline: created.holdExpiresAt.toISOString(),
  };
}
