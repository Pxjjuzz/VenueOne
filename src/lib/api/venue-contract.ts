import type {
  VenueHourRow,
  VenueModelRow,
  VenuePhotoRow,
  VenuePricingRow,
  VenueRow,
  VenueWithOwner,
} from "@/lib/types";
import { parseVenueAttributes, type VenueAttributes } from "@/lib/venue-catalog";

// The public v1 response shapes. They are plain JSON with money in paise, so the
// mobile client never does currency maths of its own and never reads a table.

export type VenueSummarySource = Pick<
  VenueWithOwner,
  | "id"
  | "slug"
  | "name"
  | "category"
  | "city"
  | "state"
  | "capacity"
  | "photo_path"
  | "photo_count"
  | "min_price_paise"
  | "max_price_paise"
>;

export type VenueSummary = {
  id: string;
  slug: string;
  name: string;
  category: VenueRow["category"];
  city: string;
  state: string;
  capacity: number | null;
  photoCount: number;
  coverPhotoUrl: string | null;
  priceRange: { minPaise: number; maxPaise: number } | null;
};

export type VenueDetailSource = {
  venue: Pick<
    VenueRow,
    | "id"
    | "slug"
    | "name"
    | "category"
    | "description"
    | "address_line"
    | "city"
    | "state"
    | "pincode"
    | "latitude"
    | "longitude"
    | "capacity"
    | "length_m"
    | "width_m"
    | "attributes"
    | "booking_policy"
    | "payment_window_minutes"
    | "accepting_bookings"
    | "owner_id"
  >;
  pricing: Pick<VenuePricingRow, "slot" | "amount_paise">[];
  hours: Pick<VenueHourRow, "weekday" | "opens_at" | "closes_at" | "is_closed">[];
  amenities: string[];
  photos: Pick<VenuePhotoRow, "storage_path" | "alt_text" | "width" | "height">[];
  ownerName: string | null;
  ownerBusinessName: string | null;
};

export type VenueDetail = {
  id: string;
  slug: string;
  name: string;
  category: VenueRow["category"];
  description: string;
  address: { line: string; city: string; state: string; pincode: string };
  coordinates: { latitude: number | null; longitude: number | null };
  capacity: number | null;
  size: { lengthM: number | null; widthM: number | null };
  attributes: VenueAttributes;
  booking: {
    policy: VenueRow["booking_policy"];
    paymentWindowMinutes: number;
    acceptingBookings: boolean;
  };
  attribution: { kind: "venueone" | "owner"; label: string };
  pricing: { slot: string; amountPaise: number }[];
  hours: { weekday: number; opensAt: string; closesAt: string; isClosed: boolean }[];
  amenities: string[];
  photos: { url: string; alt: string; width: number | null; height: number | null }[];
  // Only a published model is ever described here. The GLB URL is not exposed,
  // because the phone client shows the preview instead of downloading geometry.
  model: { accuracy: VenueModelRow["accuracy"]; version: number; previewUrl: string | null } | null;
};

// Postgres returns numeric columns and jsonb as strings through the driver used
// here, so the API converts once, at the boundary, instead of trusting types.
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function serializeVenueSummary(
  row: VenueSummarySource,
  photoUrl: (storagePath: string) => string,
): VenueSummary {
  const hasRange = row.min_price_paise != null && row.max_price_paise != null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    city: row.city,
    state: row.state,
    capacity: row.capacity,
    photoCount: row.photo_count,
    coverPhotoUrl: row.photo_path ? photoUrl(row.photo_path) : null,
    priceRange: hasRange
      ? { minPaise: row.min_price_paise as number, maxPaise: row.max_price_paise as number }
      : null,
  };
}

export function serializeVenueDetail(
  source: VenueDetailSource,
  options: {
    photoUrl: (storagePath: string) => string;
    model: Pick<VenueModelRow, "accuracy" | "version" | "preview_path"> | null;
    modelPreviewUrl: (storagePath: string) => string;
  },
): VenueDetail {
  const { venue } = source;
  const platformManaged = !venue.owner_id;

  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    category: venue.category,
    description: venue.description,
    address: {
      line: venue.address_line,
      city: venue.city,
      state: venue.state,
      pincode: venue.pincode,
    },
    coordinates: {
      latitude: toNumberOrNull(venue.latitude),
      longitude: toNumberOrNull(venue.longitude),
    },
    capacity: venue.capacity,
    size: {
      lengthM: toNumberOrNull(venue.length_m),
      widthM: toNumberOrNull(venue.width_m),
    },
    attributes: parseVenueAttributes(venue.category, asRecord(venue.attributes)),
    booking: {
      policy: venue.booking_policy,
      paymentWindowMinutes: venue.payment_window_minutes,
      acceptingBookings: venue.accepting_bookings,
    },
    attribution: {
      kind: platformManaged ? "venueone" : "owner",
      label: platformManaged
        ? "The VenueOne team"
        : source.ownerBusinessName || source.ownerName || "A verified venue owner",
    },
    pricing: source.pricing
      .filter((row) => row.amount_paise != null)
      .map((row) => ({ slot: row.slot, amountPaise: row.amount_paise as number })),
    hours: source.hours.map((row) => ({
      weekday: row.weekday,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
      isClosed: row.is_closed,
    })),
    amenities: source.amenities,
    photos: source.photos.map((photo) => ({
      url: options.photoUrl(photo.storage_path),
      alt: photo.alt_text,
      width: photo.width,
      height: photo.height,
    })),
    model: options.model
      ? {
          accuracy: options.model.accuracy,
          version: options.model.version,
          previewUrl: options.model.preview_path
            ? options.modelPreviewUrl(options.model.preview_path)
            : null,
        }
      : null,
  };
}
