"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  ownerRequestDecisionAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Field, FormAlert, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: AdminActionState = {};

export function AdminOwnerDecision({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(ownerRequestDecisionAction, initial);
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
      <input type="hidden" name="requestId" value={requestId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}

      <Field
        label="Decision note"
        htmlFor={`owner-request-note-${requestId}`}
        hint="Required when rejecting. Shared with the applicant."
      >
        <Textarea
          id={`owner-request-note-${requestId}`}
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="Verification outcome, missing information, or a short reason…"
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
          Approve access
        </SubmitButton>
        <SubmitButton
          name="decision"
          value="reject"
          variant="secondary"
          pendingLabel="Rejecting…"
          className="sm:flex-1"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Reject application
        </SubmitButton>
      </div>
    </form>
  );
}
