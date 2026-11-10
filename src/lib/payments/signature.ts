import { createHmac, timingSafeEqual } from "node:crypto";

function safeCompare(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function razorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  secret: string;
}): string {
  return createHmac("sha256", input.secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  if (!input.orderId || !input.paymentId || !input.signature || !input.secret) return false;
  return safeCompare(
    razorpayPaymentSignature({
      orderId: input.orderId,
      paymentId: input.paymentId,
      secret: input.secret,
    }),
    input.signature,
  );
}

export function razorpayWebhookSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function verifyRazorpayWebhookSignature(input: {
  body: string;
  signature: string;
  secret: string;
}): boolean {
  if (!input.body || !input.signature || !input.secret) return false;
  return safeCompare(
    razorpayWebhookSignature(input.body, input.secret),
    input.signature,
  );
}
