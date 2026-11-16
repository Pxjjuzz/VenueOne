import { loadMonthAvailability } from "@/lib/booking/availability";
import { isVenueSlug, parseMonthQuery } from "@/lib/api/catalog-params";
import { apiError, apiJson, PUBLIC_API_VERSION } from "@/lib/api/response";
import { dbQuery } from "@/lib/db";
import { limitByIp } from "@/lib/rate-limit";
import type { VenueCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isVenueSlug(slug)) return apiError(400, "invalid_slug", "Use a venue slug.");

  const url = new URL(request.url);
  const month = parseMonthQuery(Object.fromEntries(url.searchParams.entries()));
  if (!month.ok) return apiError(400, "invalid_month", month.message);

  const rate = await limitByIp("api-v1-availability", 120, 60);
  if (!rate.ok) {
    return apiError(429, "rate_limited", "Too many requests. Try again shortly.");
  }

  const venues = await dbQuery<{ id: string; category: VenueCategory }>(
    "select id, category from venues where slug = $1 and status = 'approved'",
    [slug],
  );
  const venue = venues[0];
  if (!venue) return apiError(404, "venue_not_found", "Venue not found.");

  const availability = await loadMonthAvailability(venue.id, month.value.month, venue.category);

  return apiJson(
    {
      data: {
        ...availability,
        venueSlug: slug,
      },
      meta: { version: PUBLIC_API_VERSION, generatedAt: new Date().toISOString() },
    },
    { cache: "no-store" },
  );
}
