import { isVenueSlug } from "@/lib/api/catalog-params";
import { apiError, apiJson, PUBLIC_API_VERSION } from "@/lib/api/response";
import { serializeVenueDetail } from "@/lib/api/venue-contract";
import { getPublishedVenueModel } from "@/lib/models/queries";
import { modelPublicUrl } from "@/lib/models/storage";
import { limitByIp } from "@/lib/rate-limit";
import { photoPublicUrl } from "@/lib/storage";
import { getPublicVenueBySlug } from "@/lib/venues/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isVenueSlug(slug)) return apiError(400, "invalid_slug", "Use a venue slug.");

  const rate = await limitByIp("api-v1-venue", 240, 60);
  if (!rate.ok) {
    return apiError(429, "rate_limited", "Too many requests. Try again shortly.");
  }

  const bundle = await getPublicVenueBySlug(slug);
  if (!bundle) return apiError(404, "venue_not_found", "Venue not found.");

  const model = await getPublishedVenueModel(bundle.venue.id);

  return apiJson(
    {
      data: serializeVenueDetail(bundle, {
        photoUrl: photoPublicUrl,
        model,
        modelPreviewUrl: modelPublicUrl,
      }),
      meta: { version: PUBLIC_API_VERSION, generatedAt: new Date().toISOString() },
    },
    { cache: "public, max-age=60, stale-while-revalidate=300" },
  );
}
