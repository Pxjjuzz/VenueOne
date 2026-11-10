"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import {
  demoPaymentAction,
  startPaymentAction,
  verifyPaymentAction,
} from "@/app/actions/booking";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { formatMoney } from "@/lib/format";
import type { PaymentStartResult } from "@/lib/payments/service";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact?: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
};

type RazorpayConstructor = new (options: RazorpayOptions) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Checkout could not load.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Checkout could not load."));
    document.body.appendChild(script);
  });
}

export function BookingPaymentPanel({
  bookingId,
  reference,
  totalPaise,
  paymentMode,
  testMode,
}: {
  bookingId: string;
  reference: string;
  totalPaise: number;
  paymentMode: "razorpay" | "demo" | "unavailable";
  testMode: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "starting" | "checkout" | "confirming">("idle");

  async function begin() {
    setError(null);
    setNotice(null);
    setBusy(true);
    setStage("starting");
    try {
      const start = await startPaymentAction(bookingId);
      if (!start.ok) {
        setError(start.error);
        setBusy(false);
        setStage("idle");
        return;
      }

      if (start.mode === "demo") {
        await finishDemo(start);
        return;
      }

      await openRazorpay(start);
    } catch (cause) {
      console.error("Payment start failed", cause);
      setError("Payment could not be started. Try again or contact support.");
      setBusy(false);
      setStage("idle");
    }
  }

  async function finishDemo(start: Extract<PaymentStartResult, { ok: true; mode: "demo" }>) {
    const result = await demoPaymentAction({ bookingId, paymentId: start.paymentId });
    setBusy(false);
    setStage("idle");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(result.message);
    router.refresh();
  }

  async function openRazorpay(start: Extract<PaymentStartResult, { ok: true; mode: "razorpay" }>) {
    await loadCheckoutScript();
    if (!window.Razorpay) throw new Error("Checkout is unavailable in this browser.");

    setStage("checkout");
    const checkout = new window.Razorpay({
      key: start.keyId,
      amount: start.amountPaise,
      currency: start.currency,
      name: process.env.NEXT_PUBLIC_BRAND_NAME || "VenueOne",
      description: `Booking ${start.bookingReference}`,
      order_id: start.orderId,
      prefill: {
        name: start.prefill.name,
        email: start.prefill.email,
        ...(start.prefill.contact ? { contact: start.prefill.contact } : {}),
      },
      theme: { color: "#244c3b" },
      modal: {
        ondismiss: () => {
          setBusy(false);
          setStage("idle");
          setNotice(
            "Checkout was closed. No payment is confirmed unless the server verifies it.",
          );
        },
      },
      handler: async (response) => {
        setStage("confirming");
        const result = await verifyPaymentAction({
          bookingId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        setBusy(false);
        setStage("idle");
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setNotice(result.message);
        router.refresh();
      },
    });
    checkout.open();
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-[-0.025em] text-foreground">
            Complete payment
          </h2>
          <p className="mt-1 text-sm text-muted">
            Amount due <span className="font-semibold text-foreground tabular">{formatMoney(totalPaise)}</span>{" "}
            for {reference}.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted">
          {paymentMode === "razorpay" ? (testMode ? "Razorpay test" : "Razorpay live") : "Payment unavailable"}
        </span>
      </div>

      {paymentMode === "demo" ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-warning/30 bg-warning-soft px-3.5 py-3 text-xs leading-relaxed text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Local demo payment.</span> No money moves and no
            provider is contacted. The server still performs the state transition. This flow
            is disabled in production.
          </p>
        </div>
      ) : paymentMode === "unavailable" ? (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-surface-secondary px-3.5 py-3 text-xs leading-relaxed text-muted">
          Online payment is not configured in this environment. The booking record remains
          valid, but payment cannot be completed online. Contact support for assistance.
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-info/30 bg-info-soft px-3.5 py-3 text-xs leading-relaxed text-info">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            The payment order is created on the server. The booking is only confirmed after
            the server verifies the provider signature or receives a verified webhook.
          </p>
        </div>
      )}

      {error ? <FormAlert tone="error" className="mt-4">{error}</FormAlert> : null}
      {notice ? <FormAlert tone="success" className="mt-4">{notice}</FormAlert> : null}

      <Button
        type="button"
        size="lg"
        className="mt-5 w-full"
        onClick={begin}
        loading={busy}
        disabled={paymentMode === "unavailable"}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {stage === "confirming" ? "Verifying with server…" : stage === "checkout" ? "Waiting for checkout…" : "Starting…"}
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            {paymentMode === "demo" ? "Complete demo payment" : `Pay ${formatMoney(totalPaise)}`}
          </>
        )}
      </Button>

      <p className="mt-3 flex items-start gap-1.5 text-[0.68rem] leading-relaxed text-muted">
        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
        Do not close this page while verification is in progress. If the payment succeeds but
        the page does not update, refresh once; the webhook can also confirm it server-side.
      </p>
    </div>
  );
}
