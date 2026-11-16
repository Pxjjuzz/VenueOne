import { z } from "zod";

// Query parsing for the public v1 API. Kept free of database imports so the
// contract can be unit tested without a running database.

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    },
    z.number().int().min(min).max(max).optional(),
  );

export const venueCategorySchema = z.enum(["hall", "ground"]);

export const venueListQuerySchema = z
  .object({
    category: venueCategorySchema,
    q: optionalText(100),
    city: optionalText(80),
    minPricePaise: optionalInt(0, 100_000_000),
    maxPricePaise: optionalInt(0, 100_000_000),
    minCapacity: optionalInt(1, 100_000),
    amenity: optionalText(60),
    sport: optionalText(40),
    surface: optionalText(40),
    sort: z.enum(["newest", "price_asc", "price_desc", "capacity_desc"]).optional(),
    page: optionalInt(1, 500),
    pageSize: optionalInt(1, 24),
  })
  .refine(
    (value) =>
      value.minPricePaise === undefined ||
      value.maxPricePaise === undefined ||
      value.minPricePaise <= value.maxPricePaise,
    { message: "minPricePaise cannot be greater than maxPricePaise.", path: ["minPricePaise"] },
  );

export type VenueListQuery = z.infer<typeof venueListQuerySchema>;

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Check the query parameters.";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

export function parseVenueListQuery(input: Record<string, string>): ParseResult<VenueListQuery> {
  const parsed = venueListQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  return { ok: true, value: parsed.data };
}

export function parseMonthQuery(input: Record<string, string>): ParseResult<{ month: string }> {
  const parsed = z
    .object({
      month: z
        .string()
        .trim()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month in YYYY-MM format, for example 2026-12."),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed.error) };
  return { ok: true, value: parsed.data };
}

export function isVenueSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,119}$/i.test(value);
}

export function isVenueId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
