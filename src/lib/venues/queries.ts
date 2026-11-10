import "server-only";

import { dbQuery } from "@/lib/db";
import type {
  OwnerRequestRow,
  VenueBlockRow,
  VenueCategory,
  VenueHourRow,
  VenuePhotoRow,
  VenuePricingRow,
  VenueRow,
  VenueStatusEventRow,
  VenueWithOwner,
} from "@/lib/types";

// The amenities table is normalised as (venue_id, name), so a row type is just
// a string once selected. Kept local to avoid leaking table shape to the UI.
type VenueAmenitiesRow = { name: string };

export type VenueBundle = {
  venue: VenueRow;
  photos: VenuePhotoRow[];
  pricing: VenuePricingRow[];
  hours: VenueHourRow[];
  amenities: string[];
  // Internal publication history. Only owner and admin bundles request it.
  statusHistory: VenueStatusEventRow[];
  ownerName: string | null;
  ownerEmail: string | null;
  ownerBusinessName: string | null;
  ownerPhone: string | null;
};

export type VenueListFilters = {
  category: VenueCategory;
  q?: string;
  city?: string;
  minPricePaise?: number;
  maxPricePaise?: number;
  minCapacity?: number;
  amenity?: string;
  sport?: string;
  surface?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "capacity_desc";
  page?: number;
  pageSize?: number;
};

export type VenueListResult = {
  items: VenueWithOwner[];
  total: number;
  page: number;
  pageSize: number;
};

const PRICE_MIN_SQL =
  "(select min(p.amount_paise) from venue_pricing p where p.venue_id = v.id and p.amount_paise is not null)";
const PRICE_MAX_SQL =
  "(select max(p.amount_paise) from venue_pricing p where p.venue_id = v.id and p.amount_paise is not null)";

export async function listPublicVenues(filters: VenueListFilters): Promise<VenueListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(24, Math.max(1, filters.pageSize ?? 12));
  const where: string[] = ["v.status = 'approved'", "v.category = $1"];
  const params: (string | number)[] = [filters.category];

  if (filters.q?.trim()) {
    params.push(filters.q.trim().slice(0, 100));
    const index = params.length;
    where.push(
      `(v.search_vector @@ websearch_to_tsquery('english', $${index})
        or v.name ilike '%' || $${index} || '%'
        or v.city ilike '%' || $${index} || '%')`,
    );
  }

  if (filters.city?.trim()) {
    params.push(filters.city.trim());
    where.push(`lower(v.city) = lower($${params.length})`);
  }

  if (filters.minCapacity) {
    params.push(filters.minCapacity);
    where.push(`v.capacity is not null and v.capacity >= $${params.length}`);
  }

  if (filters.minPricePaise || filters.maxPricePaise) {
    const conditions: string[] = [];
    if (filters.minPricePaise) {
      params.push(filters.minPricePaise);
      conditions.push(`p.amount_paise >= $${params.length}`);
    }
    if (filters.maxPricePaise) {
      params.push(filters.maxPricePaise);
      conditions.push(`p.amount_paise <= $${params.length}`);
    }
    where.push(
      `exists (select 1 from venue_pricing p where p.venue_id = v.id and p.amount_paise is not null and ${conditions.join(" and ")})`,
    );
  }

  if (filters.amenity?.trim()) {
    params.push(filters.amenity.trim());
    where.push(
      `exists (select 1 from venue_amenities a where a.venue_id = v.id and lower(a.name) = lower($${params.length}))`,
    );
  }

  if (filters.sport?.trim()) {
    params.push(filters.sport.trim());
    where.push(
      `exists (
        select 1 from jsonb_array_elements_text(coalesce(v.attributes->'sports', '[]'::jsonb)) sport
        where lower(sport) = lower($${params.length})
      )`,
    );
  }

  if (filters.surface?.trim()) {
    params.push(filters.surface.trim());
    where.push(`v.attributes->>'surfaceType' = $${params.length}`);
  }

  const orderBy = (() => {
    switch (filters.sort) {
      case "price_asc":
        return `${PRICE_MIN_SQL} asc nulls last, v.published_at desc nulls last`;
      case "price_desc":
        return `${PRICE_MIN_SQL} desc nulls last, v.published_at desc nulls last`;
      case "capacity_desc":
        return "v.capacity desc nulls last, v.published_at desc nulls last";
      default:
        return "v.published_at desc nulls last, v.created_at desc";
    }
  })();

  params.push(pageSize, (page - 1) * pageSize);

  const rows = await dbQuery<VenueWithOwner & { total_count: number }>(
    `select v.*,
            p.full_name as owner_name,
            p.email as owner_email,
            (select photo.storage_path from venue_photos photo where photo.venue_id = v.id order by photo.sort_order asc, photo.created_at asc limit 1) as photo_path,
            (select count(*)::int from venue_photos photo where photo.venue_id = v.id) as photo_count,
            ${PRICE_MIN_SQL} as min_price_paise,
            ${PRICE_MAX_SQL} as max_price_paise,
            count(*) over()::int as total_count
     from venues v
     left join profiles p on p.id = v.owner_id
     where ${where.join(" and ")}
     order by ${orderBy}
     limit $${params.length - 1} offset $${params.length}`,
    params,
  );

  return {
    items: rows.map(({ total_count: _total, ...row }) => row),
    total: rows[0]?.total_count ?? 0,
    page,
    pageSize,
  };
}

export type VenueFacets = {
  cities: { value: string; count: number }[];
  amenities: { value: string; count: number }[];
  sports: { value: string; count: number }[];
  surfaces: { value: string; count: number }[];
  minPricePaise: number | null;
  maxPricePaise: number | null;
  maxCapacity: number | null;
};

export async function getPublicVenueFacets(
  category: VenueCategory,
): Promise<VenueFacets> {
  const [cities, amenities, sports, surfaces, priceRows, capacityRows] = await Promise.all([
    dbQuery<{ value: string; count: number }>(
      `select v.city as value, count(*)::int as count
       from venues v
       where v.status = 'approved' and v.category = $1 and v.city <> ''
       group by v.city
       order by v.city`,
      [category],
    ),
    dbQuery<{ value: string; count: number }>(
      `select a.name as value, count(*)::int as count
       from venue_amenities a
       join venues v on v.id = a.venue_id
       where v.status = 'approved' and v.category = $1
       group by a.name
       order by count desc, a.name`,
      [category],
    ),
    category === "ground"
      ? dbQuery<{ value: string; count: number }>(
          `select sport as value, count(*)::int as count
           from venues v
           cross join lateral jsonb_array_elements_text(coalesce(v.attributes->'sports', '[]'::jsonb)) sport
           where v.status = 'approved' and v.category = 'ground'
           group by sport
           order by count desc, sport`,
        )
      : Promise.resolve([]),
    category === "ground"
      ? dbQuery<{ value: string; count: number }>(
          `select v.attributes->>'surfaceType' as value, count(*)::int as count
           from venues v
           where v.status = 'approved' and v.category = 'ground'
             and coalesce(v.attributes->>'surfaceType', '') <> ''
           group by v.attributes->>'surfaceType'
           order by count desc, value`,
        )
      : Promise.resolve([]),
    dbQuery<{ min: number | null; max: number | null }>(
      `select min(p.amount_paise)::int as min, max(p.amount_paise)::int as max
       from venue_pricing p
       join venues v on v.id = p.venue_id
       where v.status = 'approved' and v.category = $1 and p.amount_paise is not null`,
      [category],
    ),
    dbQuery<{ max: number | null }>(
      `select max(v.capacity)::int as max
       from venues v
       where v.status = 'approved' and v.category = $1`,
      [category],
    ),
  ]);

  return {
    cities,
    amenities,
    sports,
    surfaces: surfaces.filter((item) => item.value),
    minPricePaise: priceRows[0]?.min ?? null,
    maxPricePaise: priceRows[0]?.max ?? null,
    maxCapacity: capacityRows[0]?.max ?? null,
  };
}

async function loadVenueBundle(
  venue: VenueRow,
  options: { includeStatusHistory?: boolean } = {},
): Promise<VenueBundle> {
  const [photos, pricing, hours, amenities, statusHistory, owner] = await Promise.all([
    dbQuery<VenuePhotoRow>(
      "select * from venue_photos where venue_id = $1 order by sort_order asc, created_at asc",
      [venue.id],
    ),
    dbQuery<VenuePricingRow>(
      "select * from venue_pricing where venue_id = $1 order by slot",
      [venue.id],
    ),
    dbQuery<VenueHourRow>(
      `select venue_id, weekday, to_char(opens_at, 'HH24:MI') as opens_at, to_char(closes_at, 'HH24:MI') as closes_at, is_closed
       from venue_hours where venue_id = $1 order by weekday`,
      [venue.id],
    ),
    dbQuery<VenueAmenitiesRow>(
      "select name from venue_amenities where venue_id = $1 order by name",
      [venue.id],
    ),
    options.includeStatusHistory
      ? dbQuery<VenueStatusEventRow>(
          "select * from venue_reviews where venue_id = $1 order by created_at desc limit 30",
          [venue.id],
        )
      : Promise.resolve([]),
    venue.owner_id
      ? dbQuery<{
          full_name: string | null;
          email: string;
          phone: string | null;
          business_name: string | null;
        }>(
          `select p.full_name, p.email, p.phone,
                  (select r.business_name from owner_requests r
                   where r.user_id = p.id and r.status = 'approved'
                   order by r.reviewed_at desc nulls last, r.created_at desc limit 1) as business_name
           from profiles p where p.id = $1`,
          [venue.owner_id],
        )
      : Promise.resolve([]),
  ]);

  return {
    venue,
    photos,
    pricing,
    hours,
    amenities: amenities.map((item) => item.name),
    statusHistory,
    ownerName: owner[0]?.full_name ?? null,
    ownerEmail: owner[0]?.email ?? null,
    ownerBusinessName: owner[0]?.business_name ?? null,
    ownerPhone: owner[0]?.phone ?? null,
  };
}

export async function getPublicVenueBySlug(slug: string): Promise<VenueBundle | null> {
  const rows = await dbQuery<VenueRow>(
    "select * from venues where slug = $1 and status = 'approved'",
    [slug],
  );
  if (rows.length === 0) return null;
  return loadVenueBundle(rows[0]);
}

export async function getVenueForBooking(venueId: string): Promise<VenueBundle | null> {
  const rows = await dbQuery<VenueRow>(
    "select * from venues where id = $1 and status = 'approved'",
    [venueId],
  );
  if (rows.length === 0) return null;
  return loadVenueBundle(rows[0]);
}

export async function getVenueForOwner(
  venueId: string,
  ownerId: string,
): Promise<VenueBundle | null> {
  const rows = await dbQuery<VenueRow>(
    "select * from venues where id = $1 and owner_id = $2",
    [venueId, ownerId],
  );
  if (rows.length === 0) return null;
  return loadVenueBundle(rows[0], { includeStatusHistory: true });
}

export async function getVenueForAdmin(venueId: string): Promise<VenueBundle | null> {
  const rows = await dbQuery<VenueRow>("select * from venues where id = $1", [venueId]);
  if (rows.length === 0) return null;
  return loadVenueBundle(rows[0], { includeStatusHistory: true });
}

export async function listOwnerVenues(ownerId: string): Promise<VenueWithOwner[]> {
  return dbQuery<VenueWithOwner>(
    `select v.*,
            (select photo.storage_path from venue_photos photo where photo.venue_id = v.id order by photo.sort_order limit 1) as photo_path,
            (select count(*)::int from venue_photos photo where photo.venue_id = v.id) as photo_count,
            ${PRICE_MIN_SQL} as min_price_paise,
            ${PRICE_MAX_SQL} as max_price_paise,
            p.full_name as owner_name,
            p.email as owner_email
     from venues v
     left join profiles p on p.id = v.owner_id
     where v.owner_id = $1
     order by v.updated_at desc`,
    [ownerId],
  );
}

export async function listAdminVenues(input: {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: VenueWithOwner[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const where: string[] = ["1 = 1"];
  const params: (string | number)[] = [];

  if (input.status && input.status !== "all") {
    params.push(input.status);
    where.push(`v.status = $${params.length}`);
  }

  if (input.q?.trim()) {
    params.push(`%${input.q.trim().slice(0, 100)}%`);
    where.push(`(v.name ilike $${params.length} or v.city ilike $${params.length})`);
  }

  params.push(pageSize, (page - 1) * pageSize);

  const rows = await dbQuery<VenueWithOwner & { total_count: number }>(
    `select v.*,
            p.full_name as owner_name,
            p.email as owner_email,
            (select photo.storage_path from venue_photos photo where photo.venue_id = v.id order by photo.sort_order limit 1) as photo_path,
            (select count(*)::int from venue_photos photo where photo.venue_id = v.id) as photo_count,
            ${PRICE_MIN_SQL} as min_price_paise,
            ${PRICE_MAX_SQL} as max_price_paise,
            count(*) over()::int as total_count
     from venues v
     left join profiles p on p.id = v.owner_id
     where ${where.join(" and ")}
     order by
       case v.status when 'submitted' then 0 when 'under_review' then 1 when 'draft' then 2 else 3 end,
       v.submitted_at desc nulls last,
       v.updated_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params,
  );

  return {
    items: rows.map(({ total_count: _total, ...row }) => row),
    total: rows[0]?.total_count ?? 0,
    page,
    pageSize,
  };
}

export async function getOwnerRequestForUser(
  userId: string,
): Promise<OwnerRequestRow | null> {
  const rows = await dbQuery<OwnerRequestRow>(
    "select * from owner_requests where user_id = $1 order by created_at desc limit 1",
    [userId],
  );
  return rows[0] ?? null;
}

export async function listAdminOwnerRequests(
  status = "all",
): Promise<(OwnerRequestRow & { full_name: string | null; email: string; owner_status: string })[]> {
  const params: string[] = [];
  let clause = "1 = 1";
  if (status !== "all") {
    params.push(status);
    clause = "r.status = $1";
  }
  return dbQuery<OwnerRequestRow & { full_name: string | null; email: string; owner_status: string }>(
    `select r.*, p.full_name, p.email, p.owner_status
     from owner_requests r
     join profiles p on p.id = r.user_id
     where ${clause}
     order by case r.status when 'pending' then 0 else 1 end, r.created_at desc`,
    params,
  );
}

export async function getOwnerRequestById(
  id: string,
): Promise<(OwnerRequestRow & { full_name: string | null; email: string }) | null> {
  const rows = await dbQuery<OwnerRequestRow & { full_name: string | null; email: string }>(
    `select r.*, p.full_name, p.email
     from owner_requests r join profiles p on p.id = r.user_id
     where r.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listVenueBlocks(venueId: string): Promise<VenueBlockRow[]> {
  return dbQuery<VenueBlockRow>(
    `select * from venue_blocks
     where venue_id = $1 and ends_at > now()
     order by starts_at asc`,
    [venueId],
  );
}

export function approvedPricing(pricing: VenuePricingRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of pricing) {
    if (row.amount_paise != null) map.set(row.slot, row.amount_paise);
  }
  return map;
}

export function minApprovedPrice(pricing: VenuePricingRow[]): number | null {
  const values = pricing
    .map((row) => row.amount_paise)
    .filter((value): value is number => value != null);
  return values.length ? Math.min(...values) : null;
}
