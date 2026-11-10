"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Send } from "lucide-react";
import {
  submitVenueAction,
  toggleAcceptingBookingsAction,
  type OwnerActionState,
} from "@/app/actions/owner";
import { FormAlert } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import type { VenueStatus } from "@/lib/types";

const initial: OwnerActionState = {};

export function VenuePublishControls({
  venueId,
  status,
  accepting,
  issues,
}: {
  venueId: string;
  status: VenueStatus;
  accepting: boolean;
  issues: string[];
}) {
  const [state, action] = useActionState(submitVenueAction, initial);
  const router = useRouter();
  const previous = useRef("");

  useEffect(() => {
    if (state.success && state.success !== previous.current) {
      previous.current = state.success;
      router.refresh();
    }
  }, [state.success, router]);

  const inReview = status === "submitted" || status === "under_review";
  const canSubmit = !inReview && status !== "suspended";
  const blocked = issues.length > 0;

  return (
    <div className="space-y-4">
      {status === "approved" ? (
        <p className="rounded-[var(--radius-sm)] border border-info/30 bg-info-soft px-3 py-2.5 text-xs leading-relaxed text-info">
          This venue is live. Saving editorial changes moves it back into the review
          queue; operational blocks and the accepting toggle take effect immediately.
        </p>
      ) : null}

      {status === "rejected" ? (
        <FormAlert tone="warning">
          Publication was not approved. Update the venue using the reviewer&apos;s
          notes, then submit it again.
        </FormAlert>
      ) : null}

      {inReview ? (
        <p className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-warning/30 bg-warning-soft px-3 py-2.5 text-xs leading-relaxed text-warning">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          This venue is in the publication review queue. It is not visible to the
          public until an administrator approves it.
        </p>
      ) : null}

      {canSubmit && blocked ? (
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface-secondary/50 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">Before you can submit</p>
          <ul className="mt-1.5 space-y-1 text-[0.68rem] leading-relaxed text-muted">
            {issues.map((issue) => (
              <li key={issue} className="flex items-start gap-1.5">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-warning" aria-hidden="true" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canSubmit ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="venueId" value={venueId} />
          {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
          {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}
          <SubmitButton pendingLabel="Submitting…" disabled={blocked} className="w-full">
            <Send className="h-4 w-4" aria-hidden="true" />
            {status === "approved" ? "Submit editorial changes" : "Submit for publication review"}
          </SubmitButton>
          <p className="text-[0.68rem] leading-relaxed text-muted">
            Review checks the description, photographs, pricing, hours and contact
            details. Approval is the second of the two independent decisions.
          </p>
        </form>
      ) : null}

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            {accepting ? (
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            )}
            <div>
              <p className="text-xs font-semibold text-foreground">
                {accepting ? "Accepting new bookings" : "New bookings paused"}
              </p>
              <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted">
                Existing bookings are unaffected either way.
              </p>
            </div>
          </div>
        </div>
        <form action={toggleAcceptingBookingsAction} className="mt-3">
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="accepting" value={accepting ? "false" : "true"} />
          <SubmitButton variant="secondary" size="sm" pendingLabel="Updating…">
            {accepting ? (
              <>
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                Pause new bookings
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Resume new bookings
              </>
            )}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

export function VenueAcceptingToggle({
  venueId,
  accepting,
}: {
  venueId: string;
  accepting: boolean;
}) {
  return (
    <form action={toggleAcceptingBookingsAction}>
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="accepting" value={accepting ? "false" : "true"} />
      <Button type="submit" variant="outline" size="sm">
        {accepting ? "Pause bookings" : "Resume bookings"}
      </Button>
    </form>
  );
}
