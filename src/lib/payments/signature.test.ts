import { describe, expect, it } from "vitest";
import {
  razorpayPaymentSignature,
  razorpayWebhookSignature,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/signature";

const secret = "test_secret_key";

describe("Razorpay payment signature", () => {
  it("accepts a signature produced with the same secret and payload", () => {
    const signature = razorpayPaymentSignature({
      orderId: "order_123",
      paymentId: "pay_456",
      secret,
    });
    expect(
      verifyRazorpayPaymentSignature({
        orderId: "order_123",
        paymentId: "pay_456",
        signature,
        secret,
      }),
    ).toBe(true);
  });

  it("rejects a signature for a different order, payment or secret", () => {
    const signature = razorpayPaymentSignature({
      orderId: "order_123",
      paymentId: "pay_456",
      secret,
    });
    expect(
      verifyRazorpayPaymentSignature({
        orderId: "order_999",
        paymentId: "pay_456",
        signature,
        secret,
      }),
    ).toBe(false);
    expect(
      verifyRazorpayPaymentSignature({
        orderId: "order_123",
        paymentId: "pay_999",
        signature,
        secret,
      }),
    ).toBe(false);
    expect(
      verifyRazorpayPaymentSignature({
        orderId: "order_123",
        paymentId: "pay_456",
        signature,
        secret: "other_secret",
      }),
    ).toBe(false);
  });

  it("rejects missing pieces instead of throwing", () => {
    expect(
      verifyRazorpayPaymentSignature({
        orderId: "",
        paymentId: "pay_456",
        signature: "abc",
        secret,
      }),
    ).toBe(false);
    expect(
      verifyRazorpayPaymentSignature({
        orderId: "order_123",
        paymentId: "pay_456",
        signature: "",
        secret,
      }),
    ).toBe(false);
  });
});

describe("Razorpay webhook signature", () => {
  const body = JSON.stringify({ event: "payment.captured", id: "evt_1" });

  it("accepts the exact raw body and rejects any mutation", () => {
    const signature = razorpayWebhookSignature(body, secret);
    expect(verifyRazorpayWebhookSignature({ body, signature, secret })).toBe(true);
    expect(
      verifyRazorpayWebhookSignature({
        body: body.replace("captured", "failed"),
        signature,
        secret,
      }),
    ).toBe(false);
    expect(
      verifyRazorpayWebhookSignature({ body: `${body} `, signature, secret }),
    ).toBe(false);
  });

  it("rejects an empty body, signature or secret", () => {
    expect(verifyRazorpayWebhookSignature({ body: "", signature: "x", secret })).toBe(false);
    expect(verifyRazorpayWebhookSignature({ body, signature: "", secret })).toBe(false);
    expect(verifyRazorpayWebhookSignature({ body, signature: "x", secret: "" })).toBe(false);
  });
});
