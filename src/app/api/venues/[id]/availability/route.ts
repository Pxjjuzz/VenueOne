import { loadMonthAvailability } from "@/lib/booking/availability";
import { dbQuery } from "@/lib/db";
import { limitByIp } from "@/lib/rate-limit";
import { isoMonthKey } from "@/lib/time";
import type { VenueCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Invalid venue." }, { status: 400 });
  }
  if (!isoMonthKey(month)) {
    return Response.json({ error: "Use a month in YYYY-MM format." }, { status: 400 });
  }

  const rate = await limitByIp("availability", 120, 60);
  if (!rate.ok) {
    return Response.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const venues = await dbQuery<{ id: string; category: VenueCategory }>(
    "select id, category from venues where id = $1 and status = 'approved'",
    [id],
  );
  if (venues.length === 0) {
    return Response.json({ error: "Venue not found." }, { status: 404 });
  }

  const availability = await loadMonthAvailability(id, month, venues[0].category);
  return Response.json(availability, {
    headers: { "Cache-Control": "no-store" },
  });
}
