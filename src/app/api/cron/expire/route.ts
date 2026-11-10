import { timingSafeEqual } from "node:crypto";
import { dbQuery } from "@/lib/db";
import { dispatchUpcomingBookingReminders } from "@/lib/booking/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get("authorization") || "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const provided = bearer || request.headers.get("x-cron-secret")?.trim() || "";
  if (!provided) return false;

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function run(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const expired = await dbQuery<{ refresh_booking_states: number }>(
      "select refresh_booking_states()",
    );
    await dbQuery("select purge_rate_limits()");
    const reminders = await dispatchUpcomingBookingReminders();
    return Response.json({
      ok: true,
      expired: expired[0]?.refresh_booking_states ?? 0,
      remindersSent: reminders.dispatched,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scheduled maintenance failed", error);
    return Response.json({ error: "Maintenance failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
