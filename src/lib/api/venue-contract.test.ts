import { describe, expect, it } from "vitest";

import {
  serializeVenueDetail,
  serializeVenueSummary,
  type VenueDetailSource,
} from "@/lib/api/venue-contract";

const photoUrl = (storagePath: string) => `https://cdn.test/${storagePath}`;
const modelPreviewUrl = (storagePath: string) => `https://cdn.test/models/${storagePath}`;

function source(overrides: Partial<VenueDetailSource> = {}): VenueDetailSource {
  return {
    venue: {
      id: "venue-1",
      slug: "hall-one",
      name: "Hall One",
      category: "hall",
      description: "A hall for gatherings.",
      address_line: "1 Main Road",
      city: "Anekal",
      state: "Karnataka",
      pincode: "562106",
      latitude: 12.7,
      longitude: 77.7,
      capacity: 350,
      length_m: null,
      width_m: null,
      attributes: { parking: true },
      booking_policy: "instant",
      payment_window_minutes: 30,
      accepting_bookings: true,
      owner_id: null,
    },
    pricing: [
      { slot: "full_day", amount_paise: 4_500_000 },
      { slot: "half_day", amount_paise: null },
    ],
    hours: [{ weekday: 0, opens_at: "09:00", closes_at: "22:00", is_closed: false }],
    amenities: ["Parking"],
    photos: [
      { storage_path: "venues/venue-1/cover.webp", alt_text: "Cover", width: 1200, height: 800 },
    ],
    ownerName: null,
    ownerBusinessName: null,
    ...overrides,
  };
}

describe("serializeVenueSummary", () => {
  it("maps the cover photo and approved price range", () => {
    const summary = serializeVenueSummary(
      {
        id: "venue-1",
        slug: "hall-one",
        name: "Hall One",
        category: "hall",
        city: "Anekal",
        state: "Karnataka",
        capacity: 350,
        photo_path: "venues/venue-1/cover.webp",
        photo_count: 6,
        min_price_paise: 2_000_000,
        max_price_paise: 4_500_000,
      },
      photoUrl,
    );

    expect(summary.coverPhotoUrl).toBe("https://cdn.test/venues/venue-1/cover.webp");
    expect(summary.photoCount).toBe(6);
    expect(summary.priceRange).toEqual({ minPaise: 2_000_000, maxPaise: 4_500_000 });
  });

  it("returns no price range when a bound is missing", () => {
    const summary = serializeVenueSummary(
      {
        id: "venue-1",
        slug: "hall-one",
        name: "Hall One",
        category: "hall",
        city: "Anekal",
        state: "Karnataka",
        capacity: null,
        photo_path: null,
        photo_count: 0,
        min_price_paise: null,
        max_price_paise: null,
      },
      photoUrl,
    );

    expect(summary.priceRange).toBeNull();
    expect(summary.coverPhotoUrl).toBeNull();
  });
});

describe("serializeVenueDetail", () => {
  it("calls an ownerless venue a VenueOne listing", () => {
    const detail = serializeVenueDetail(source(), {
      photoUrl,
      model: null,
      modelPreviewUrl,
    });

    expect(detail.attribution).toEqual({ kind: "venueone", label: "The VenueOne team" });
    expect(detail.model).toBeNull();
  });

  it("uses the owner business name when an owner is attached", () => {
    const detail = serializeVenueDetail(
      source({
        venue: { ...source().venue, owner_id: "owner-1" },
        ownerName: "Asha Rao",
        ownerBusinessName: "Rao Events",
      }),
      { photoUrl, model: null, modelPreviewUrl },
    );

    expect(detail.attribution).toEqual({ kind: "owner", label: "Rao Events" });
  });

  it("falls back to the owner name when there is no business name", () => {
    const detail = serializeVenueDetail(
      source({
        venue: { ...source().venue, owner_id: "owner-1" },
        ownerName: "Asha Rao",
      }),
      { photoUrl, model: null, modelPreviewUrl },
    );

    expect(detail.attribution.label).toBe("Asha Rao");
  });

  it("drops pricing rows without an approved amount", () => {
    const detail = serializeVenueDetail(source(), {
      photoUrl,
      model: null,
      modelPreviewUrl,
    });

    expect(detail.pricing).toEqual([{ slot: "full_day", amountPaise: 4_500_000 }]);
  });

  it("keeps photo order and maps every photo to a URL", () => {
    const detail = serializeVenueDetail(
      source({
        photos: [
          { storage_path: "venues/venue-1/a.webp", alt_text: "A", width: 1200, height: 800 },
          { storage_path: "venues/venue-1/b.webp", alt_text: "B", width: 800, height: 600 },
        ],
      }),
      { photoUrl, model: null, modelPreviewUrl },
    );

    expect(detail.photos.map((photo) => photo.url)).toEqual([
      "https://cdn.test/venues/venue-1/a.webp",
      "https://cdn.test/venues/venue-1/b.webp",
    ]);
  });

  it("describes a published model without exposing the GLB path", () => {
    const detail = serializeVenueDetail(source(), {
      photoUrl,
      model: { accuracy: "conceptual", version: 2, preview_path: "venue-models/venue-1/2/preview.webp" },
      modelPreviewUrl,
    });

    expect(detail.model).toEqual({
      accuracy: "conceptual",
      version: 2,
      previewUrl: "https://cdn.test/models/venue-models/venue-1/2/preview.webp",
    });
    expect(JSON.stringify(detail)).not.toContain(".glb");
  });

  it("converts driver strings for coordinates and attributes", () => {
    const detail = serializeVenueDetail(
      source({
        venue: {
          ...source().venue,
          latitude: "12.703471" as unknown as number,
          longitude: "77.701237" as unknown as number,
          attributes: JSON.stringify({
            indoorOutdoor: "Indoor",
            stage: true,
            parking: true,
            kitchen: false,
            rooms: null,
            seatingCapacity: 350,
          }) as unknown as Record<string, unknown>,
        },
      }),
      { photoUrl, model: null, modelPreviewUrl },
    );

    expect(detail.coordinates).toEqual({ latitude: 12.703471, longitude: 77.701237 });
    expect(detail.attributes).toMatchObject({
      kind: "hall",
      indoorOutdoor: "Indoor",
      stage: true,
      seatingCapacity: 350,
    });
  });
});
