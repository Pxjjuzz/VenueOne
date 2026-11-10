"use client";

import { useActionState } from "react";
import { Ban, Undo2 } from "lucide-react";
import {
  requestCancellationAction,
  withdrawCancellationAction,
  type BookingActionState,
} from "@/app/actions/booking";
import { Field, FormAlert, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: BookingActionState = {};

export function CancellationRequestForm({
  bookingId,
  estimatedRefundPaise,
  hasCapturedPayment,
  eligible,
  deadlineLabel,
}: {
  bookingId: string;
  estimatedRefundPaise: number;
  hasCapturedPayment: boolean;
  eligible: boolean;
  deadlineLabel: string;
}) {
  const [state, action] = useActionState(requestCancellationAction, initial);

  if (state.success) {
    return (
      <FormAlert tone="success">
        <p className="font-semibold">Cancellation request recorded</p>
        <p className="mt-1 leading-relaxed">{state.success}</p>
      </FormAlert>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      <div className="rounded-[var(--radius-sm)] border border-border bg-surface-secondary/60 px-3.5 py-3 text-xs leading-relaxed text-muted-strong">
        <p>
          {!hasCapturedPayment
            ? "No payment has been captured for this booking, so there is no refund to process. Approving the cancellation releases the slot."
            : eligible
              ? `Maximum refund under the saved policy: ${new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(estimatedRefundPaise / 100)}.`
              : "This booking is outside the refund window under the saved policy."}{" "}
          {deadlineLabel}
        </p>
        <p className="mt-1.5">
          A cancellation request is reviewed by an administrator. The refund is a separate
          transaction and is never marked complete before the provider confirms it.
        </p>
      </div>

      <Field
        label="Reason for cancellation"
        htmlFor="cancel-reason"
        required
        hint="At least 10 characters. This is shared with the venue and platform administrators."
        error={state.fieldErrors?.reason?.[0]}
      >
        <Textarea id="cancel-reason" name="reason" required minLength={10} maxLength={1000} rows={4} />
      </Field>

      <SubmitButton
        variant="danger"
        confirm="Submit a cancellation request? The booking stays active until an administrator reviews it."
        pendingLabel="Submitting…"
      >
        <Ban className="h-4 w-4" aria-hidden="true" />
        Request cancellation
      </SubmitButton>
    </form>
  );
}

export function WithdrawCancellationForm({
  cancellationId,
  bookingId,
}: {
  cancellationId: string;
  bookingId: string;
}) {
  const [state, action] = useActionState(withdrawCancellationAction, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="cancellationId" value={cancellationId} />
      <input type="hidden" name="bookingId" value={bookingId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}
      <SubmitButton variant="secondary" size="sm" pendingLabel="Withdrawing…">
        <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
        Withdraw request
      </SubmitButton>
    </form>
  );
}
