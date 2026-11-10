import { z } from "zod";
import { isHourAligned, isValidDateKey, isoMonthKey } from "./time";
import {
  GROUND_TYPES,
  INDOOR_OUTDOOR,
  SPORTS,
  SURFACE_TYPES,
} from "./venue-catalog";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Enter a valid email address.");

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a contact number.")
  .max(24, "Contact number is too long.")
  .regex(/^[+0-9][0-9 ()-]*$/, "Use digits, spaces, brackets, + or -.");

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter a 6-digit PIN code.");

export const dateKeySchema = z
  .string()
  .trim()
  .refine(isValidDateKey, "Choose a valid date.");

export const monthKeySchema = z
  .string()
  .trim()
  .refine(isoMonthKey, "Choose a valid month.");

export const hourTimeSchema = z
  .string()
  .trim()
  .refine(isHourAligned, "Use a whole hour, for example 09:00.");

export const anyTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time.");

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (value) => {
      const normalized = emptyToUndefined(value);
      return normalized === undefined ? undefined : Number(normalized);
    },
    z.number().int().min(min).max(max).optional(),
  );

const optionalDecimal = (min: number, max: number) =>
  z.preprocess(
    (value) => {
      const normalized = emptyToUndefined(value);
      return normalized === undefined ? undefined : Number(normalized);
    },
    z.number().finite().min(min).max(max).optional(),
  );

const optionalMoney = z.preprocess(
  (value) => {
    const normalized = emptyToUndefined(value);
    return normalized === undefined ? undefined : Number(normalized);
  },
  z.number().finite().min(0).max(10_000_000).optional(),
);

export const venueHoursSchema = z
  .array(
    z.object({
      weekday: z.coerce.number().int().min(0).max(6),
      opensAt: hourTimeSchema,
      closesAt: hourTimeSchema,
      isClosed: z.boolean(),
    }),
  )
  .length(7, "All seven weekdays are required.")
  .superRefine((hours, ctx) => {
    const seen = new Set<number>();
    for (const [index, day] of hours.entries()) {
      if (seen.has(day.weekday)) {
        ctx.addIssue({ code: "custom", message: "Duplicate weekday.", path: [index, "weekday"] });
      }
      seen.add(day.weekday);
      if (!day.isClosed && day.closesAt <= day.opensAt) {
        ctx.addIssue({
          code: "custom",
          message: "Closing time must be after opening time.",
          path: [index, "closesAt"],
        });
      }
    }
  });

export const venueFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a venue name.").max(120),
  category: z.enum(["hall", "ground"]),
  description: z.string().trim().max(5000).default(""),
  addressLine: z.string().trim().max(200).default(""),
  city: z.string().trim().max(80).default(""),
  state: z.string().trim().max(80).default(""),
  pincode: z
    .string()
    .trim()
    .max(6)
    .refine((value) => value === "" || /^\d{6}$/.test(value), "Enter a 6-digit PIN code.")
    .default(""),
  latitude: optionalDecimal(-90, 90),
  longitude: optionalDecimal(-180, 180),
  contactName: optionalText(120),
  contactPhone: z
    .string()
    .trim()
    .max(24)
    .refine(
      (value) => value === "" || /^[+0-9][0-9 ()-]{6,23}$/.test(value),
      "Use digits, spaces, brackets, + or -.",
    )
    .default(""),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address.",
    )
    .default(""),
  capacity: optionalInt(1, 100000),
  lengthM: optionalDecimal(1, 5000),
  widthM: optionalDecimal(1, 5000),
  indoorOutdoor: z.enum(INDOOR_OUTDOOR).optional(),
  rooms: optionalInt(0, 500),
  stage: z.boolean().default(false),
  kitchen: z.boolean().default(false),
  parking: z.boolean().default(false),
  seatingCapacity: optionalInt(1, 100000),
  groundType: z.enum(GROUND_TYPES).optional(),
  surfaceType: z.enum(SURFACE_TYPES).optional(),
  sports: z.array(z.enum(SPORTS)).max(8).default([]),
  lighting: z.boolean().default(false),
  washrooms: z.boolean().default(false),
  changingRooms: z.boolean().default(false),
  amenities: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  otherAmenities: z.string().trim().max(500).default(""),
  pricing: z.object({
    halfDayRupees: optionalMoney,
    fullDayRupees: optionalMoney,
    hourRupees: optionalMoney,
  }),
  hours: venueHoursSchema.optional(),
  bookingPolicy: z.enum(["instant", "approval"]).default("approval"),
  paymentWindowMinutes: z.coerce.number().int().min(5).max(1440).default(20),
  acceptingBookings: z.boolean().default(true),
});

export type VenueFormInput = z.infer<typeof venueFormSchema>;

export function venueSubmissionIssues(input: {
  venue: {
    name: string;
    description: string;
    address_line: string;
    city: string;
    state: string;
    pincode: string;
    contact_phone: string | null;
    capacity: number | null;
    category: "hall" | "ground";
    attributes: Record<string, unknown>;
  };
  photoCount: number;
  proposedBySlot: Record<string, number | null | undefined>;
  hours: { weekday: number; is_closed: boolean }[];
}): string[] {
  const issues: string[] = [];
  const { venue } = input;

  if (venue.name.trim().length < 2) issues.push("Add a venue name.");
  if (venue.description.trim().length < 80) {
    issues.push("Write a description of at least 80 characters.");
  }
  if (!venue.address_line.trim()) issues.push("Add the street address.");
  if (!venue.city.trim()) issues.push("Add the city.");
  if (!venue.state.trim()) issues.push("Add the state.");
  if (!/^\d{6}$/.test(venue.pincode)) issues.push("Add a valid 6-digit PIN code.");
  if (!venue.contact_phone?.trim()) issues.push("Add a contact phone number.");
  if (input.photoCount < 1) issues.push("Upload at least one photograph.");

  if (venue.category === "hall") {
    if (!venue.capacity) issues.push("Add the maximum hall capacity.");
    if (!input.proposedBySlot.half_day) {
      issues.push("Propose a half-day price.");
    }
    if (!input.proposedBySlot.full_day) {
      issues.push("Propose a full-day price.");
    }
  } else {
    const attributes = venue.attributes as Record<string, unknown>;
    if (!attributes.groundType) issues.push("Choose a ground type.");
    if (!attributes.surfaceType) issues.push("Choose a surface type.");
    if (!Array.isArray(attributes.sports) || attributes.sports.length === 0) {
      issues.push("Select at least one supported sport.");
    }
    if (!input.proposedBySlot.hour) issues.push("Propose an hourly price.");
    const length = attributes.lengthM;
    const width = attributes.widthM;
    if ((length && !width) || (width && !length)) {
      issues.push("Provide both ground length and width, or neither.");
    }
  }

  if (!input.hours.some((day) => !day.is_closed)) {
    issues.push("Set operating hours for at least one day.");
  }

  return issues;
}

export const ownerRequestSchema = z.object({
  businessName: z.string().trim().min(2, "Enter the business or trust name.").max(160),
  contactPhone: phoneSchema,
  address: z.string().trim().min(5, "Enter the address.").max(300),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  state: z.string().trim().min(2, "Enter the state.").max(80),
  pincode: pincodeSchema,
  ownershipNotes: z.string().trim().max(2000).default(""),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
  phone: z
    .string()
    .trim()
    .max(24)
    .refine(
      (value) => value === "" || /^[+0-9][0-9 ()-]{6,23}$/.test(value),
      "Use digits, spaces, brackets, + or -.",
    )
    .default(""),
});

export const createBookingSchema = z
  .object({
    venueId: z.string().uuid(),
    date: dateKeySchema,
    slotType: z.enum(["half_day_morning", "half_day_afternoon", "full_day", "hourly"]),
    startTime: hourTimeSchema.optional(),
    hours: z.coerce.number().int().min(1).max(12).optional(),
    guestCount: z.coerce.number().int().min(1).max(100000).optional(),
    eventType: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(1000).optional(),
    idempotencyKey: z.string().trim().min(8).max(100),
  })
  .superRefine((value, ctx) => {
    if (value.slotType === "hourly") {
      if (!value.startTime) {
        ctx.addIssue({ code: "custom", message: "Choose a start time.", path: ["startTime"] });
      }
      if (!value.hours) {
        ctx.addIssue({ code: "custom", message: "Choose a duration.", path: ["hours"] });
      }
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const blockSchema = z
  .object({
    venueId: z.string().uuid(),
    startDate: dateKeySchema,
    startTime: anyTimeSchema,
    endDate: dateKeySchema,
    endTime: anyTimeSchema,
    reason: z.string().trim().min(3, "Add a short reason.").max(200),
  })
  .superRefine((value, ctx) => {
    if (value.startDate > value.endDate) {
      ctx.addIssue({ code: "custom", message: "The end date must be on or after the start date.", path: ["endDate"] });
    }
    if (value.startDate === value.endDate && value.endTime <= value.startTime) {
      ctx.addIssue({ code: "custom", message: "The end time must be after the start time.", path: ["endTime"] });
    }
  });

export const settingsSchema = z.object({
  ownerResponseHours: z.coerce.number().int().min(1).max(168),
  platformFeeRupees: z.coerce.number().min(0).max(1_000_000),
  taxPercent: z.coerce.number().min(0).max(28),
  cancellationPolicy: z.object({
    cancellationDeadlineHours: z.coerce.number().int().min(0).max(720),
    fullRefundHours: z.coerce.number().int().min(1).max(2160),
    partialRefundHours: z.coerce.number().int().min(0).max(2160),
    partialRefundPercent: z.coerce.number().int().min(0).max(100),
    notes: z.string().trim().max(1000).default(""),
  }),
});

export const legalPageSchema = z.object({
  slug: z.string().trim().min(2).max(60),
  title: z.string().trim().min(2).max(120),
  contentMd: z.string().trim().min(20).max(100_000),
  requiresLegalReview: z.boolean().default(true),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: emailSchema,
  subject: z.string().trim().min(3, "Add a subject.").max(160),
  message: z.string().trim().min(20, "Write at least 20 characters.").max(4000),
});

export const cancellationRequestSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().min(10, "Explain the reason for cancellation.").max(1000),
});

export const adminReasonSchema = z.object({
  reason: z.string().trim().min(5, "Add a reason.").max(1000),
});

export const paymentVerifySchema = z.object({
  bookingId: z.string().uuid(),
  razorpayOrderId: z.string().trim().min(4).max(120),
  razorpayPaymentId: z.string().trim().min(4).max(120),
  razorpaySignature: z.string().trim().min(10).max(300),
});
