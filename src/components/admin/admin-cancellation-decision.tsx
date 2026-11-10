"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  cancellationDecisionAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Field, FormAlert, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: AdminActionState = {};

export function AdminCancellationDecision({
  cancellationId,
}: {
  cancellationId: string;
}) {
  const [state, action] = useActionState(cancellationDecisionAction, initial);
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
      <input type="hidden" name="cancellationId" value={cancellationId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}

      <Field
        label="Administrator note"
        htmlFor={`cancellation-note-${cancellationId}`}
        optional
        hint="Shown to the customer and stored with the decision."
      >
        <Textarea
          id={`cancellation-note-${cancellationId}`}
          name="note"
          rows={2}
          maxLength={1000}
          placeholder="Policy applied, evidence reviewed, or a short explanation…"
        />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton
          name="decision"
          value="approve"
          pendingLabel="Approving…"
          className="sm:flex-1"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Approve cancellation
        </SubmitButton>
        <SubmitButton
          name="decision"
          value="reject"
          variant="secondary"
          pendingLabel="Rejecting…"
          className="sm:flex-1"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Keep booking
        </SubmitButton>
      </div>

      <p className="text-[0.68rem] leading-relaxed text-muted">
        Approval cancels the booking and releases the slot. A refund row is created only
        when the saved policy calculates an amount greater than zero. Refund success is
        recorded separately after the provider confirms it.
      </p>
    </form>
  );
}
