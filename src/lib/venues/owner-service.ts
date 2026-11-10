import "server-only";

import { randomUUID } from "node:crypto";
import { dbQuery, withTransaction } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";
import { slugify } from "@/lib/format";
import { istDateTime } from "@/lib/time";
import {
  MAX_PHOTOS_PER_VENUE,
  deleteStoredPhoto,
  processVenueImage,
  storeVenuePhoto,
} from "@/lib/storage";
import {
  venueSubmissionIssues,
  type VenueFormInput,
} from "@/lib/validation";
import type {
  ProfileRow,
  VenueHourRow,
  VenuePhotoRow,
  VenuePricingRow,
  VenueRow,
  VenueStatus,
} from "@/lib/types";

export type OwnerMutationResult =
  | { ok: true; message: string; venueId?: string; issues?: string[]; status?: VenueStatus }
  | { ok: false; error: string };

async function assertOwner(ownerId: string): Promise<OwnerMutationResult | null> {
  const rows = await dbQuery<ProfileRow>("select * from profiles where id = $1", [ownerId]);
  const profile = rows[0];
  if (!profile) return { ok: false, error: "The owner account could not be found." };
  if (profile.role !== "owner" || profile.owner_status !== "approved") {
    return { ok: false, error: "Approved venue-owner access is required for this action." };
  }
  return null;
}

async function ownedVenue(venueId: string, ownerId: string): Promise<VenueRow | null> {
  const rows = await dbQuery<VenueRow>(
    "select * from venues where id = $1 and owner_id = $2",
    [venueId, ownerId],
  );
  return rows[0] ?? null;
}

async function uniqueSlug(name: string, venueId: string): Promise<string> {
  const base = slugify(name) || "venue";
  const existing = await dbQuery<{ id: string }>("select id from venues where slug = $1", [base]);
  if (existing.length === 0 || existing[0].id === venueId) return base;
  return `${base}-${venueId.slice(0, 6)}`;
}

function categorySlots(category: "hall" | "ground"): ("half_day" | "full_day" | "hour")[] {
  return category === "hall" ? ["half_day", "full_day"] : ["hour"];
}

export async function createVenueDraft(ownerId: string): Promise<OwnerMutationResult> {
  const denied = await assertOwner(ownerId);
  if (denied) return denied;

  const count = await dbQuery<{ count: number }>(
    "select count(*)::int as count from venues where owner_id = $1",
    [ownerId],
  );
  if ((count[0]?.count ?? 0) >= 25) {
    return { ok: false, error: "This account has reached the venue listing limit. Contact support." };
  }

  const id = randomUUID();
  await dbQuery(
    `insert into venues (id, owner_id, name, slug, category, description, status)
     values ($1, $2, 'Untitled venue', $3, 'hall', '', 'draft')`,
    [id, ownerId, `draft-${id.slice(0, 8)}`],
  );
  await dbQuery(
    `insert into venue_hours (venue_id, weekday, opens_at, closes_at, is_closed)
     select $1, weekday, '09:00'::time, '18:00'::time, false
     from generate_series(0, 6) as weekday`,
    [id],
  ).catch(async () => {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      await dbQuery(
        `insert into venue_hours (venue_id, weekday, opens_at, closes_at, is_closed)
         values ($1, $2, '09:00', '18:00', false) on conflict do nothing`,
        [id, weekday],
      );
    }
  });

  await recordAudit({
    actorId: ownerId,
    action: "venue.draft.created",
    entityType: "venue",
    entityId: id,
    metadata: {},
  });

  return { ok: true, venueId: id, message: "Draft venue created." };
}

export async function saveVenue(input: {
  venueId: string;
  ownerId: string;
  ownerEmail: string;
  data: VenueFormInput;
}): Promise<OwnerMutationResult> {
  const denied = await assertOwner(input.ownerId);
  if (denied) return denied;
  const venue = await ownedVenue(input.venueId, input.ownerId);
  if (!venue) return { ok: false, error: "This venue could not be found." };

  const { data } = input;
  const slug = await uniqueSlug(data.name, venue.id);
  const attributes =
    data.category === "hall"
      ? {
          kind: "hall",
          indoorOutdoor: data.indoorOutdoor ?? "Indoor & outdoor",
          rooms: data.rooms ?? null,
          stage: data.stage,
          parking: data.parking,
          kitchen: data.kitchen,
          seatingCapacity: data.seatingCapacity ?? null,
        }
      : {
          kind: "ground",
          groundType: data.groundType ?? "",
          surfaceType: data.surfaceType ?? "",
          sports: data.sports,
          lighting: data.lighting,
          washrooms: data.washrooms,
          changingRooms: data.changingRooms,
          parking: data.parking,
        };

  const resubmit = venue.status === "approved";
  const resetToDraft =
    venue.status === "submitted" || venue.status === "under_review" || venue.status === "rejected";
  const nextStatus: VenueStatus = resubmit ? "submitted" : resetToDraft ? "draft" : venue.status;

  const amenities = [...new Set([
    ...data.amenities.map((item) => item.trim()).filter(Boolean),
    ...data.otherAmenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ])].slice(0, 30);

  const slots = categorySlots(data.category);
  const proposed: Record<string, number | undefined> = {
    half_day: data.pricing.halfDayRupees != null ? Math.round(data.pricing.halfDayRupees * 100) : undefined,
    full_day: data.pricing.fullDayRupees != null ? Math.round(data.pricing.fullDayRupees * 100) : undefined,
    hour: data.pricing.hourRupees != null ? Math.round(data.pricing.hourRupees * 100) : undefined,
  };

  await withTransaction(async (sql) => {
    await sql(
      `update venues set
         name = $2, slug = $3, category = $4, description = $5,
         address_line = $6, city = $7, state = $8, pincode = $9,
         latitude = $10, longitude = $11,
         contact_name = $12, contact_phone = $13, contact_email = $14,
         capacity = $15, length_m = $16, width_m = $17,
         attributes = $18::jsonb, booking_policy = $19,
         payment_window_minutes = $20, accepting_bookings = $21,
         status = $22, submitted_at = case when $22 = 'submitted' then now() else submitted_at end,
         rejection_reason = case when $22 = 'submitted' then null else rejection_reason end,
         updated_at = now()
       where id = $1`,
      [
        venue.id,
        data.name,
        slug,
        data.category,
        data.description,
        data.addressLine,
        data.city,
        data.state,
        data.pincode,
        data.latitude ?? null,
        data.longitude ?? null,
        data.contactName ?? null,
        data.contactPhone || null,
        data.contactEmail || null,
        data.capacity ?? null,
        data.lengthM ?? null,
        data.widthM ?? null,
        JSON.stringify(attributes),
        data.bookingPolicy,
        data.paymentWindowMinutes,
        data.acceptingBookings,
        nextStatus,
      ],
    );

    await sql("delete from venue_amenities where venue_id = $1", [venue.id]);
    for (const name of amenities) {
      await sql(
        `insert into venue_amenities (venue_id, name) values ($1, $2)
         on conflict do nothing`,
        [venue.id, name],
      );
    }

    for (const slot of slots) {
      const amount = proposed[slot];
      await sql(
        `insert into venue_pricing (venue_id, slot, proposed_amount_paise, proposed_at)
         values ($1, $2, $3::integer, case when $3::integer is null then null else now() end)
         on conflict (venue_id, slot) do update
         set proposed_amount_paise = excluded.proposed_amount_paise,
             proposed_at = excluded.proposed_at`,
        [venue.id, slot, amount ?? null],
      );
    }

    if (data.hours) {
      for (const day of data.hours) {
        await sql(
          `insert into venue_hours (venue_id, weekday, opens_at, closes_at, is_closed)
           values ($1, $2, $3, $4, $5)
           on conflict (venue_id, weekday) do update
           set opens_at = excluded.opens_at,
               closes_at = excluded.closes_at,
               is_closed = excluded.is_closed`,
          [venue.id, day.weekday, day.opensAt, day.closesAt, day.isClosed],
        );
      }
    }

    if (nextStatus !== venue.status) {
      await sql(
        `insert into venue_reviews (venue_id, actor_id, from_status, to_status, note)
         values ($1, $2, $3, $4, $5)`,
        [
          venue.id,
          input.ownerId,
          venue.status,
          nextStatus,
          resubmit
            ? "Owner edited an approved venue; resubmitted for publication review."
            : "Owner saved changes; draft reset for submission.",
        ],
      );
    }
  });

  await recordAudit({
    actorId: input.ownerId,
    actorEmail: input.ownerEmail,
    action: "venue.updated",
    entityType: "venue",
    entityId: venue.id,
    metadata: {
      fromStatus: venue.status,
      toStatus: nextStatus,
      category: data.category,
      slots: Object.keys(proposed).filter((slot) => proposed[slot] != null),
    },
  });

  if (nextStatus === "submitted") {
    await notifyAdmins({
      type: "admin.venue_submitted",
      title: "Venue edited and resubmitted",
      body: `${data.name} was updated by its owner and needs publication review again.`,
      link: `/admin/venues/${venue.id}`,
      email: true,
    });
  }

  return {
    ok: true,
    venueId: venue.id,
    status: nextStatus,
    message:
      nextStatus === "submitted"
        ? "Saved. Because this venue was published, the changes were submitted for review again."
        : "Venue saved.",
  };
}

export async function submitVenueForReview(input: {
  venueId: string;
  ownerId: string;
  ownerEmail: string;
  note?: string;
}): Promise<OwnerMutationResult> {
  const denied = await assertOwner(input.ownerId);
  if (denied) return denied;
  const venue = await ownedVenue(input.venueId, input.ownerId);
  if (!venue) return { ok: false, error: "This venue could not be found." };
  if (venue.status === "submitted" || venue.status === "under_review") {
    return { ok: true, status: venue.status, message: "This venue is already in the review queue." };
  }
  if (venue.status === "suspended") {
    return { ok: false, error: "Suspended venues cannot be submitted. Contact platform support." };
  }

  const [photos, pricing, hours] = await Promise.all([
    dbQuery<{ count: number }>(
      "select count(*)::int as count from venue_photos where venue_id = $1",
      [venue.id],
    ),
    dbQuery<VenuePricingRow>("select * from venue_pricing where venue_id = $1", [venue.id]),
    dbQuery<VenueHourRow>("select * from venue_hours where venue_id = $1", [venue.id]),
  ]);

  const proposedBySlot: Record<string, number | null | undefined> = {};
  for (const row of pricing) {
    proposedBySlot[row.slot] = row.proposed_amount_paise ?? row.amount_paise;
  }

  const issues = venueSubmissionIssues({
    venue,
    photoCount: photos[0]?.count ?? 0,
    proposedBySlot,
    hours,
  });
  if (issues.length > 0) {
    return { ok: false, error: `Complete these items before submitting: ${issues.join(" ")}` };
  }

  await withTransaction(async (sql) => {
    await sql(
      `update venues
       set status = 'submitted', submitted_at = now(), rejection_reason = null,
           reviewed_by = null, reviewed_at = null, updated_at = now()
       where id = $1`,
      [venue.id],
    );
    await sql(
      `insert into venue_reviews (venue_id, actor_id, from_status, to_status, note)
       values ($1, $2, $3, 'submitted', $4)`,
      [venue.id, input.ownerId, venue.status, input.note || "Submitted for publication review."],
    );
  });

  await notifyAdmins({
    type: "admin.venue_submitted",
    title: "Venue submitted for review",
    body: `${venue.name} (${venue.city || "no city yet"}) was submitted for publication review.`,
    link: `/admin/venues/${venue.id}`,
    email: true,
  });

  await recordAudit({
    actorId: input.ownerId,
    actorEmail: input.ownerEmail,
    action: "venue.submitted",
    entityType: "venue",
    entityId: venue.id,
    metadata: { fromStatus: venue.status },
  });

  return {
    ok: true,
    venueId: venue.id,
    status: "submitted",
    message: "Submitted for publication review. The venue stays out of the public directory until approved.",
  };
}

export async function setVenueAcceptingBookings(input: {
  venueId: string;
  ownerId: string;
  accepting: boolean;
}): Promise<OwnerMutationResult> {
  const denied = await assertOwner(input.ownerId);
  if (denied) return denied;
  const venue = await ownedVenue(input.venueId, input.ownerId);
  if (!venue) return { ok: false, error: "This venue could not be found." };

  await dbQuery(
    "update venues set accepting_bookings = $2, updated_at = now() where id = $1",
    [venue.id, input.accepting],
  );
  await recordAudit({
    actorId: input.ownerId,
    action: input.accepting ? "venue.bookings_resumed" : "venue.bookings_paused",
    entityType: "venue",
    entityId: venue.id,
    metadata: {},
  });
  return {
    ok: true,
    message: input.accepting
      ? "Bookings are open again. Existing bookings are unaffected."
      : "New bookings are paused. Existing bookings are unaffected.",
  };
}

export async function addVenuePhoto(input: {
  venueId: string;
  ownerId: string;
  file: File;
  altText: string;
}): Promise<OwnerMutationResult> {
  const denied = await assertOwner(input.ownerId);
  if (denied) return denied;
  const venue = await ownedVenue(input.venueId, input.ownerId);
  if (!venue) return { ok: false, error: "This venue could not be found." };

  const count = await dbQuery<{ count: number }>(
    "select count(*)::int as count from venue_photos where venue_id = $1",
    [venue.id],
  );
  if ((count[0]?.count ?? 0) >= MAX_PHOTOS_PER_VENUE) {
    return { ok: false, error: `A venue can have up to ${MAX_PHOTOS_PER_VENUE} photographs.` };
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  let processed: { buffer: Buffer; width: number; height: number };
  try {
    processed = await processVenueImage(buffer);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The photograph could not be read." };
  }

  let stored: { storagePath: string; width: number; height: number };
  try {
    stored = await storeVenuePhoto(venue.id, processed);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "The photograph could not be stored." };
  }

  const order = await dbQuery<{ max: number | null }>(
    "select max(sort_order) as max from venue_photos where venue_id = $1",
    [venue.id],
  );
  await dbQuery(
    `insert into venue_photos (venue_id, storage_path, alt_text, sort_order, width, height)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      venue.id,
      stored.storagePath,
      (input.altText || `${venue.name} photograph`).slice(0, 200),
      (order[0]?.max ?? -1) + 1,
      stored.width,
      stored.height,
    ],
  );

  await recordAudit({
    actorId: input.ownerId,
    action: "venue.photo.added",
    entityType: "venue",
    entityId: venue.id,
    metadata: { storagePath: stored.storagePath },
  });

  return { ok: true, message: "Photograph added." };
}

export async function deleteVenuePhoto(input: {
  venueId: string;
  ownerId: string;
  photoId: string;
}): Promise<OwnerMutationResult> {
  const denied = await assertOwner(input.ownerId);
  if (denied) return denied;
  const venue = await ownedVenue(input.venueId, input.ownerId);
  if (!venue) return { ok: false, error: "This venue could not be found." };

  const photos = await dbQuery<VenuePhotoRow>(
    "select * from venue_photos where id = $1 and venue_id = $2",
    [input.photoId, venue.id],
  );
  const photo = photos[0];
  if (!photo) return { ok: false, error: "This photograph could not be found." };

  await dbQuery("delete from venue_photos where id = $1", [photo.id]);
  await deleteStoredPhoto(photo.storage_path);

  await recordAudit({
    actorId: input.ownerId,
    action: "venue.photo.deleted",
    entityType: "venue",
    entityId: venue.id,
    metadata: { storagePath: photo.storage_path },
  });

  return { ok: true, message: "Photograph removed." };
}

export async function moveVenuePhoto(input: {
  venueId: string;
  ownerId: string;
  photoId: string;
  direction: "up" | "down";
}): Promise<OwnerMutationResult> {
  const denied = await assertOwner(input.ownerId);
  if (denied) return denied;
  const venue = await ownedVenue(input.venueId, input.ownerId);
  if (!venue) return { ok: false, error: "This venue could not be found." };

  const photos = await dbQuery<VenuePhotoRow>(
    "select * from venue_photos where venue_id = $1 order by sort_order asc, created_at asc",
    [venue.id],
  );
  const index = photos.findIndex((photo) => photo.id === input.photoId);
  if (index < 0) return { ok: false, error: "This photograph could not be found." };
  const target = input.direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= photos.length) return { ok: true, message: "Order unchanged." };

  await withTransaction(async (sql) => {
    await sql("update venue_photos set sort_order = $2 where id = $1", [photos[index].id, target]);
    await sql("update venue_photos set sort_order = $2 where id = $1", [photos[target].id, index]);
  });

  return { ok: true, message: "Photograph order updated." };
}

export async function createVenueBlock(input: {
  venueId: string;
  ownerId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
}): Promise<OwnerMutationResult> {
  const denied = await assertOwner(input.ownerId);
  if (denied) return denied;
  const venue = await ownedVenue(input.venueId, input.ownerId);
  if (!venue) return { ok: false, error: "This venue could not be found." };

  const startsAt = istDateTime(input.startDate, input.startTime);
  const endsAt = istDateTime(input.endDate, input.endTime);
  if (endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, error: "The block must end after it starts." };
  }
  if (endsAt.getTime() <= Date.now()) {
    return { ok: false, error: "Choose a block that ends in the future." };
  }

  await dbQuery(
    `insert into venue_blocks (venue_id, starts_at, ends_at, reason, block_type, created_by)
     values ($1, $2, $3, $4, 'owner', $5)`,
    [venue.id, startsAt, endsAt, input.reason, input.ownerId],
  );

  await recordAudit({
    actorId: input.ownerId,
    action: "venue.block.created",
    entityType: "venue",
    entityId: venue.id,
    metadata: { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: input.reason },
  });

  return { ok: true, message: "Unavailable time added. New bookings cannot overlap it." };
}

export async function deleteVenueBlock(input: {
  venueId: string;
  ownerId: string;
  blockId: string;
}): Promise<OwnerMutationResult> {
  const denied = await assertOwner(input.ownerId);
  if (denied) return denied;
  const venue = await ownedVenue(input.venueId, input.ownerId);
  if (!venue) return { ok: false, error: "This venue could not be found." };

  const rows = await dbQuery<{ id: string; block_type: string }>(
    "select id, block_type from venue_blocks where id = $1 and venue_id = $2",
    [input.blockId, venue.id],
  );
  if (!rows[0]) return { ok: false, error: "This block could not be found." };
  if (rows[0].block_type !== "owner") {
    return { ok: false, error: "Only owner-created blocks can be removed here." };
  }

  await dbQuery("delete from venue_blocks where id = $1", [rows[0].id]);
  await recordAudit({
    actorId: input.ownerId,
    action: "venue.block.deleted",
    entityType: "venue",
    entityId: venue.id,
    metadata: { blockId: rows[0].id },
  });
  return { ok: true, message: "Unavailable time removed." };
}
