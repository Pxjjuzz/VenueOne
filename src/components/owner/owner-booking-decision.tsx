"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { ownerDecisionAction, type OwnerActionState } from "@/app/actions/owner";
import { Field, FormAlert, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: OwnerActionState = {};

export function OwnerBookingDecision({
  bookingId,
  reference,
}: {
  bookingId: string;
  reference: string;
}) {
  const [state, action] = useActionState(ownerDecisionAction, initial);
  const router = useRouter();
  const previous = useRef("");

  useEffect(() => {
    if (state.success && state.success !== previous.current) {
      previous.current = state.success;
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}

      <Field
        label="Note to the customer"
        htmlFor="owner-decision-note"
        optional
        hint="Included in the decision notification. Required context helps the customer understand a decline."
      >
        <Textarea
          id="owner-decision-note"
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="Arrival instructions, a reason the slot cannot be held, or anything the customer should know…"
        />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton
          name="decision"
          value="approve"
          pendingLabel="Accepting…"
          className="sm:flex-1"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Accept request
        </SubmitButton>
        <SubmitButton
          name="decision"
          value="reject"
          variant="secondary"
          pendingLabel="Declining…"
          className="sm:flex-1"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Decline request
        </SubmitButton>
      </div>

      <p className="text-[0.68rem] leading-relaxed text-muted">
        Accepting opens a payment window for {reference}. Declining releases the held
        slot immediately; no payment is taken.
      </p>
    </form>
  );
}
