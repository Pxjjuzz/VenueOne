import "server-only";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { dbQuery, withTransaction } from "@/lib/db";
import {
  MAX_PHOTOS_PER_VENUE,
  deleteStoredPhoto,
  processVenueImage,
  storeVenuePhoto,
} from "@/lib/storage";
import type { VenuePhotoRow } from "@/lib/types";

export type AdminPhotoActor = { id: string; email: string };

export type AdminPhotoResult = { ok: boolean; error?: string; message?: string };

async function loadVenue(venueId: string) {
  const rows = await dbQuery<{ id: string; name: string; slug: string }>(
    "select id, name, slug from venues where id = $1",
    [venueId],
  );
  return rows[0] ?? null;
}

/**
 * Photographs surface on the venue page, both category listings and the home
 * page cards, so every write clears all four.
 */
function refreshPublicPages(slug: string) {
  revalidatePath(`/venues/${slug}`);
  revalidatePath("/halls");
  revalidatePath("/grounds");
  revalidatePath("/");
}

export async function addVenuePhotoAsAdmin(input: {
  venueId: string;
  actor: AdminPhotoActor;
  file: File;
  altText: string;
}): Promise<AdminPhotoResult> {
  const venue = await loadVenue(input.venueId);
  if (!venue) return { ok: false, error: "That venue does not exist." };

  const count = await dbQuery<{ count: number }>(
    "select count(*)::int as count from venue_photos where venue_id = $1",
    [venue.id],
  );
  if ((count[0]?.count ?? 0) >= MAX_PHOTOS_PER_VENUE) {
    return {
      ok: false,
      error: `A venue can hold ${MAX_PHOTOS_PER_VENUE} photographs. Remove one before adding another.`,
    };
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  let processed: { buffer: Buffer; width: number; height: number };
  try {
    processed = await processVenueImage(buffer);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The photograph could not be read.",
    };
  }

  let stored: { storagePath: string; width: number; height: number };
  try {
    stored = await storeVenuePhoto(venue.id, processed);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "The photograph could not be stored.",
    };
  }

  const order = await dbQuery<{ max: number | null }>(
    "select max(sort_order) as max from venue_photos where venue_id = $1",
    [venue.id],
  );
  const inserted = await dbQuery<{ id: string }>(
    `insert into venue_photos (venue_id, storage_path, alt_text, sort_order, width, height)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [
      venue.id,
      stored.storagePath,
      (input.altText.trim() || `${venue.name} photograph`).slice(0, 200),
      (order[0]?.max ?? -1) + 1,
      stored.width,
      stored.height,
    ],
  );

  await recordAudit({
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: "venue.photo.added",
    entityType: "venue",
    entityId: venue.id,
    metadata: { storagePath: stored.storagePath, by: "admin", photoId: inserted[0]?.id },
  });

  refreshPublicPages(venue.slug);

  return { ok: true, message: "Photograph added to the listing." };
}

export async function deleteVenuePhotoAsAdmin(input: {
  venueId: string;
  actor: AdminPhotoActor;
  photoId: string;
}): Promise<AdminPhotoResult> {
  const venue = await loadVenue(input.venueId);
  if (!venue) return { ok: false, error: "That venue does not exist." };

  const rows = await dbQuery<VenuePhotoRow>(
    "select * from venue_photos where id = $1 and venue_id = $2",
    [input.photoId, venue.id],
  );
  const photo = rows[0];
  if (!photo) return { ok: false, error: "That photograph could not be found." };

  await dbQuery("delete from venue_photos where id = $1", [photo.id]);
  await deleteStoredPhoto(photo.storage_path);

  await recordAudit({
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: "venue.photo.deleted",
    entityType: "venue",
    entityId: venue.id,
    metadata: { storagePath: photo.storage_path, by: "admin", photoId: photo.id },
  });

  refreshPublicPages(venue.slug);

  return { ok: true, message: "Photograph removed." };
}

export async function moveVenuePhotoAsAdmin(input: {
  venueId: string;
  actor: AdminPhotoActor;
  photoId: string;
  direction: "up" | "down";
}): Promise<AdminPhotoResult> {
  const venue = await loadVenue(input.venueId);
  if (!venue) return { ok: false, error: "That venue does not exist." };

  const photos = await dbQuery<VenuePhotoRow>(
    "select * from venue_photos where venue_id = $1 order by sort_order asc, created_at asc",
    [venue.id],
  );
  const index = photos.findIndex((photo) => photo.id === input.photoId);
  if (index < 0) return { ok: false, error: "That photograph could not be found." };

  const target = input.direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= photos.length) {
    return { ok: true, message: "That photograph is already in place." };
  }

  await withTransaction(async (sql) => {
    await sql("update venue_photos set sort_order = $2 where id = $1", [photos[index].id, target]);
    await sql("update venue_photos set sort_order = $2 where id = $1", [photos[target].id, index]);
  });

  await recordAudit({
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: "venue.photo.reordered",
    entityType: "venue",
    entityId: venue.id,
    metadata: { by: "admin", photoId: photos[index].id, direction: input.direction },
  });

  refreshPublicPages(venue.slug);

  return { ok: true, message: "Photograph order updated." };
}
