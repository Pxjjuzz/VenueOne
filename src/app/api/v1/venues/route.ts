import { parseVenueListQuery } from "@/lib/api/catalog-params";
import { apiError, apiJson, PUBLIC_API_VERSION } from "@/lib/api/response";
import { serializeVenueSummary } from "@/lib/api/venue-contract";
import { limitByIp } from "@/lib/rate-limit";
import { photoPublicUrl } from "@/lib/storage";
import { listPublicVenues } from "@/lib/venues/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseVenueListQuery(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.ok) return apiError(400, "invalid_query", parsed.message);

  const rate = await limitByIp("api-v1-venues", 120, 60);
  if (!rate.ok) {
    return apiError(429, "rate_limited", "Too many requests. Try again shortly.");
  }

  const query = parsed.value;
  const result = await listPublicVenues({
    category: query.category,
    q: query.q,
    city: query.city,
    minPricePaise: query.minPricePaise,
    maxPricePaise: query.maxPricePaise,
    minCapacity: query.minCapacity,
    amenity: query.amenity,
    sport: query.sport,
    surface: query.surface,
    sort: query.sort ?? "newest",
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 12,
  });

  return apiJson(
    {
      data: result.items.map((row) => serializeVenueSummary(row, photoPublicUrl)),
      meta: {
        version: PUBLIC_API_VERSION,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        hasMore: result.page * result.pageSize < result.total,
        generatedAt: new Date().toISOString(),
      },
    },
    { cache: "public, max-age=60, stale-while-revalidate=300" },
  );
}
