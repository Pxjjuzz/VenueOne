"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarX2, Trash2 } from "lucide-react";
import {
  createVenueBlockAction,
  deleteVenueBlockAction,
  type OwnerActionState,
} from "@/app/actions/owner";
import { Field, FormAlert, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

const initial: OwnerActionState = {};

export type OwnerBlock = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  blockType: string;
};

function DeleteBlock({
  venueId,
  blockId,
}: {
  venueId: string;
  blockId: string;
}) {
  const [state, action] = useActionState(deleteVenueBlockAction, initial);
  const router = useRouter();
  const previous = useRef("");

  useEffect(() => {
    if (state.success && state.success !== previous.current) {
      previous.current = state.success;
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Remove this unavailable time?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="blockId" value={blockId} />
      {state.error ? <p className="mb-1 text-[0.68rem] text-error">{state.error}</p> : null}
      <Button type="submit" variant="ghost" size="sm" className="text-error hover:bg-error-soft">
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Remove
      </Button>
    </form>
  );
}

export function VenueBlocksManager({
  venueId,
  blocks,
  today,
}: {
  venueId: string;
  blocks: OwnerBlock[];
  today: string;
}) {
  const [state, action] = useActionState(createVenueBlockAction, initial);
  const router = useRouter();
  const previous = useRef("");

  useEffect(() => {
    if (state.success && state.success !== previous.current) {
      previous.current = state.success;
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <p className="rounded-[var(--radius-sm)] border border-border bg-surface-secondary/50 px-3.5 py-3 text-xs leading-relaxed text-muted">
          No unavailable time is recorded. Add maintenance windows, private events or other
          periods when the venue cannot be booked.
        </p>
      ) : (
        <ul className="space-y-2">
          {blocks.map((block) => (
            <li key={block.id} className="flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-3">
              <div className="flex items-start gap-2.5">
                <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium text-foreground">{block.reason}</p>
                  <p className="mt-0.5 text-[0.68rem] text-muted">
                    {formatDateTime(block.startsAt)} → {formatDateTime(block.endsAt)}
                  </p>
                  {block.blockType !== "owner" ? (
                    <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.08em] text-muted">
                      {block.blockType} block
                    </p>
                  ) : null}
                </div>
              </div>
              {block.blockType === "owner" ? (
                <DeleteBlock venueId={venueId} blockId={block.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="space-y-3 rounded-[var(--radius-sm)] border border-border bg-surface-secondary/40 p-3.5">
        <input type="hidden" name="venueId" value={venueId} />
        <p className="text-xs font-semibold text-foreground">Add unavailable time</p>
        {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
        {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From date" htmlFor="block-start-date" required>
            <Input id="block-start-date" name="startDate" type="date" defaultValue={today} required />
          </Field>
          <Field label="From time" htmlFor="block-start-time" required>
            <Input id="block-start-time" name="startTime" type="time" defaultValue="09:00" required />
          </Field>
          <Field label="To date" htmlFor="block-end-date" required>
            <Input id="block-end-date" name="endDate" type="date" defaultValue={today} required />
          </Field>
          <Field label="To time" htmlFor="block-end-time" required>
            <Input id="block-end-time" name="endTime" type="time" defaultValue="18:00" required />
          </Field>
        </div>
        <Field label="Reason" htmlFor="block-reason" required>
          <Input id="block-reason" name="reason" required minLength={3} maxLength={200} placeholder="Maintenance, private event…" />
        </Field>
        <SubmitButton size="sm" variant="secondary" pendingLabel="Adding…">
          Add unavailable time
        </SubmitButton>
      </form>
    </div>
  );
}
