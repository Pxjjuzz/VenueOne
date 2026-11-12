import "server-only";

import { dbQuery } from "@/lib/db";
import type { VenueModelRow } from "@/lib/types";

/**
 * The only lookup a customer page is allowed to use. It requires both a
 * published model and an approved venue, so an unpublished or rejected file can
 * never be resolved to a URL.
 */
export async function getPublishedVenueModel(venueId: string): Promise<VenueModelRow | null> {
  const rows = await dbQuery<VenueModelRow>(
    `select m.* from venue_models m
     join venues v on v.id = m.venue_id
     where m.venue_id = $1
       and m.status = 'published'
       and m.storage_path is not null
       and v.status = 'approved'`,
    [venueId],
  );
  return rows[0] ?? null;
}

export async function getVenueModelForAdmin(venueId: string): Promise<VenueModelRow | null> {
  const rows = await dbQuery<VenueModelRow>(
    "select * from venue_models where venue_id = $1",
    [venueId],
  );
  return rows[0] ?? null;
}

export type VenueModelSummary = {
  venue_id: string;
  status: VenueModelRow["status"];
  accuracy: VenueModelRow["accuracy"];
  version: number;
};

/** Compact list used by the admin venue index. */
export async function listVenueModelSummaries(): Promise<Map<string, VenueModelSummary>> {
  const rows = await dbQuery<VenueModelSummary>(
    "select venue_id, status, accuracy, version from venue_models",
  );
  return new Map(rows.map((row) => [row.venue_id, row]));
}
