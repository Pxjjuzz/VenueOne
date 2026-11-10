import "server-only";

export type RazorpayOrder = {
  id: string;
  amount: number;
  amount_paid?: number;
  currency: string;
  receipt?: string | null;
  status: string;
  notes?: Record<string, string>;
};

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
  captured?: boolean;
  error_description?: string | null;
  created_at?: number;
};

export type RazorpayRefund = {
  id: string;
  payment_id: string;
  amount: number;
  currency?: string;
  status: string;
  speed_processed?: string | null;
};

type RazorpayClient = {
  orders: {
    create(input: Record<string, unknown>): Promise<RazorpayOrder>;
    fetch(orderId: string): Promise<RazorpayOrder>;
    fetchPayments(orderId: string): Promise<{ items: RazorpayPayment[] }>;
  };
  payments: {
    fetch(paymentId: string): Promise<RazorpayPayment>;
    capture(
      paymentId: string,
      amount: number,
      currency: string,
    ): Promise<RazorpayPayment>;
    refund(
      paymentId: string,
      input: Record<string, unknown>,
    ): Promise<RazorpayRefund>;
  };
  refunds: {
    fetch(refundId: string): Promise<RazorpayRefund>;
  };
};

export type RazorpayConfig = {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
  testMode: boolean;
};

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null,
    testMode: keyId.startsWith("rzp_test_"),
  };
}

export function razorpayConfigured(): boolean {
  return getRazorpayConfig() !== null;
}

/**
 * Demo payments are a local verification aid, never a production payment
 * method. They are unavailable in production builds and on Vercel.
 */
export function demoPaymentsEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL === "1") return false;
  if (razorpayConfigured()) return false;
  return process.env.DEMO_PAYMENTS_ENABLED !== "false";
}

let cachedClient:
  | { signature: string; client: RazorpayClient }
  | null = null;

export async function getRazorpayClient(): Promise<{
  config: RazorpayConfig;
  client: RazorpayClient;
}> {
  const config = getRazorpayConfig();
  if (!config) {
    throw new Error("Razorpay is not configured.");
  }

  const signature = `${config.keyId}:${config.keySecret.slice(-6)}`;
  if (cachedClient?.signature === signature) {
    return { config, client: cachedClient.client };
  }

  const razorpayModule = await import("razorpay");
  const Razorpay = (razorpayModule.default ?? razorpayModule) as unknown as new (options: {
    key_id: string;
    key_secret: string;
  }) => RazorpayClient;

  const client = new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });

  cachedClient = { signature, client };
  return { config, client };
}

export function safeProviderMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      error?: { description?: unknown };
      message?: unknown;
    };
    if (
      candidate.error &&
      typeof candidate.error.description === "string" &&
      candidate.error.description.length < 300
    ) {
      return candidate.error.description;
    }
  }
  return "The payment provider could not complete the request.";
}
