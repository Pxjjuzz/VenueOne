import type { VenueCategory } from "./types";

export const HALL_AMENITIES = [
  "Parking",
  "Kitchen",
  "Stage",
  "Air conditioning",
  "Power backup",
  "Washrooms",
  "Seating",
  "Sound system",
  "Green room",
  "Wheelchair access",
  "Drinking water",
  "Security",
] as const;

export const GROUND_AMENITIES = [
  "Floodlights",
  "Changing rooms",
  "Washrooms",
  "Parking",
  "Drinking water",
  "Seating",
  "First aid",
  "Equipment rental",
  "Scoreboard",
  "Covered dugout",
  "Wheelchair access",
  "Security",
] as const;

export const GROUND_TYPES = [
  "Football ground",
  "Cricket ground",
  "College playground",
  "Sports turf",
  "Community ground",
  "Multi-use ground",
] as const;

export const SURFACE_TYPES = [
  "Natural grass",
  "Artificial turf",
  "Clay",
  "Concrete",
  "Wooden",
  "Synthetic",
  "Gravel",
] as const;

export const SPORTS = [
  "Football",
  "Cricket",
  "Hockey",
  "Basketball",
  "Volleyball",
  "Badminton",
  "Athletics",
  "Multi-sport",
] as const;

export const INDOOR_OUTDOOR = ["Indoor", "Outdoor", "Indoor & outdoor"] as const;

export const EVENT_TYPES = [
  "Wedding",
  "Family function",
  "Birthday celebration",
  "Meeting",
  "Public gathering",
  "Workshop or class",
  "Sports event",
  "Other",
] as const;

export function amenitiesForCategory(category: VenueCategory): readonly string[] {
  return category === "hall" ? HALL_AMENITIES : GROUND_AMENITIES;
}

export type HallAttributes = {
  kind: "hall";
  indoorOutdoor: "Indoor" | "Outdoor" | "Indoor & outdoor";
  rooms: number | null;
  stage: boolean;
  parking: boolean;
  kitchen: boolean;
  seatingCapacity: number | null;
};

export type GroundAttributes = {
  kind: "ground";
  groundType: string;
  surfaceType: string;
  sports: string[];
  lighting: boolean;
  washrooms: boolean;
  changingRooms: boolean;
  parking: boolean;
};

export type VenueAttributes = HallAttributes | GroundAttributes;

export function parseVenueAttributes(
  category: VenueCategory,
  raw: Record<string, unknown> | null | undefined,
): VenueAttributes {
  const value = raw ?? {};
  if (category === "hall") {
    const indoor = value.indoorOutdoor;
    return {
      kind: "hall",
      indoorOutdoor:
        indoor === "Indoor" || indoor === "Outdoor" || indoor === "Indoor & outdoor"
          ? indoor
          : "Indoor & outdoor",
      rooms: typeof value.rooms === "number" ? value.rooms : null,
      stage: value.stage === true,
      parking: value.parking === true,
      kitchen: value.kitchen === true,
      seatingCapacity:
        typeof value.seatingCapacity === "number" ? value.seatingCapacity : null,
    };
  }

  return {
    kind: "ground",
    groundType: typeof value.groundType === "string" ? value.groundType : "",
    surfaceType: typeof value.surfaceType === "string" ? value.surfaceType : "",
    sports: Array.isArray(value.sports)
      ? value.sports.filter((sport): sport is string => typeof sport === "string")
      : [],
    lighting: value.lighting === true,
    washrooms: value.washrooms === true,
    changingRooms: value.changingRooms === true,
    parking: value.parking === true,
  };
}
