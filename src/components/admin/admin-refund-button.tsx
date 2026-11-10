"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Undo2 } from "lucide-react";
import {
  processRefundAction,
  syncPaymentAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { FormAlert } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: AdminActionState = {};

export function AdminProcessRefund({
  refundId,
  isDemo,
}: {
  refundId: string;
  isDemo: boolean;
}) {
  const [state, action] = useActionState(processRefundAction, initial);
  const router = useRouter();
  const previous = useRef("");

  useEffect(() => {
    if (state.success && state.success !== previous.current) {
      previous.current = state.success;
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="refundId" value={refundId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}
      <SubmitButton
        size="sm"
        variant="secondary"
        pendingLabel={isDemo ? "Recording…" : "Submitting…"}
        confirm={
          isDemo
            ? undefined
            : "Submit this refund to Razorpay? It will stay initiated until the provider confirms it."
        }
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
        {isDemo ? "Process demo refund" : "Submit refund"}
      </SubmitButton>
    </form>
  );
}

export function AdminSyncPayment({ bookingId }: { bookingId: string }) {
  const [state, action] = useActionState(syncPaymentAction, initial);
  const router = useRouter();
  const previous = useRef("");

  useEffect(() => {
    if (state.success && state.success !== previous.current) {
      previous.current = state.success;
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}
      <SubmitButton size="sm" variant="secondary" pendingLabel="Checking Razorpay…">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Sync with Razorpay
      </SubmitButton>
    </form>
  );
}
