import { handleRazorpayWebhook } from "@/lib/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large." }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: "Could not read payload." }, { status: 400 });
  }

  if (!rawBody || rawBody.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const signature = request.headers.get("x-razorpay-signature") || "";
  const eventId = request.headers.get("x-razorpay-event-id") || undefined;

  const result = await handleRazorpayWebhook({ rawBody, signature, eventId });
  return Response.json(
    {
      ok: result.ok,
      message: result.message,
      duplicate: result.duplicate ?? false,
      handled: result.handled ?? false,
    },
    { status: result.httpStatus },
  );
}

export function GET() {
  return Response.json(
    { error: "Razorpay sends webhooks with POST. This endpoint does not accept GET." },
    { status: 405 },
  );
}
