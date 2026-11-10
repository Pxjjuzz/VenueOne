"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, EyeOff, PauseCircle, Send } from "lucide-react";
import {
  venuePublicationDecisionAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Field, FormAlert, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { VenueStatus } from "@/lib/types";

const initial: AdminActionState = {};

export function AdminVenueDecision({
  venueId,
  status,
}: {
  venueId: string;
  status: VenueStatus;
}) {
  const [state, action] = useActionState(venuePublicationDecisionAction, initial);
  const router = useRouter();
  const previous = useRef("");

  useEffect(() => {
    if (state.success && state.success !== previous.current) {
      previous.current = state.success;
      router.refresh();
    }
  }, [state.success, router]);

  const inQueue = status === "submitted" || status === "under_review";
  const isPublished = status === "approved";
  const canRepublish = status === "unpublished" || status === "suspended";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="venueId" value={venueId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}

      <Field
        label="Reviewer note"
        htmlFor="admin-venue-note"
        hint="Required for changes, unpublishing and suspension. It is sent to the owner."
      >
        <Textarea
          id="admin-venue-note"
          name="note"
          rows={4}
          maxLength={1000}
          placeholder="What needs attention, which policy applies, or why the venue is being removed from public view…"
        />
      </Field>

      <div className="flex flex-col gap-2">
        {inQueue ? (
          <SubmitButton name="decision" value="approve" pendingLabel="Publishing…">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Approve and publish
          </SubmitButton>
        ) : null}

        {canRepublish ? (
          <SubmitButton name="decision" value="approve" pendingLabel="Publishing…">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {status === "suspended" ? "Reinstate and publish" : "Publish again"}
          </SubmitButton>
        ) : null}

        {inQueue ? (
          <SubmitButton
            name="decision"
            value="changes"
            variant="secondary"
            pendingLabel="Requesting changes…"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Request changes
          </SubmitButton>
        ) : null}

        {isPublished ? (
          <SubmitButton
            name="decision"
            value="changes"
            variant="secondary"
            pendingLabel="Unpublishing…"
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            Unpublish and request changes
          </SubmitButton>
        ) : null}

        {isPublished ? (
          <SubmitButton
            name="decision"
            value="unpublish"
            variant="outline"
            pendingLabel="Unpublishing…"
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            Unpublish without owner edit
          </SubmitButton>
        ) : null}

        {status !== "suspended" ? (
          <SubmitButton
            name="decision"
            value="suspend"
            variant="outline"
            pendingLabel="Suspending…"
          >
            <PauseCircle className="h-4 w-4" aria-hidden="true" />
            Suspend venue
          </SubmitButton>
        ) : null}
      </div>

      <p className="text-[0.68rem] leading-relaxed text-muted">
        Approval copies the owner&apos;s proposed prices into the public approved
        prices. Unpublishing takes effect immediately for new visitors; existing
        bookings are not cancelled.
      </p>
    </form>
  );
}
