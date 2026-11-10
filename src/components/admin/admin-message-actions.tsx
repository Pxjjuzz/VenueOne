"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, MailOpen } from "lucide-react";
import {
  contactMessageStatusAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { FormAlert } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: AdminActionState = {};

export function AdminMessageActions({
  messageId,
  status,
}: {
  messageId: string;
  status: "new" | "read" | "replied";
}) {
  const [state, action] = useActionState(contactMessageStatusAction, initial);
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
      <input type="hidden" name="messageId" value={messageId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}
      <div className="flex flex-wrap gap-2">
        {status !== "read" && status !== "replied" ? (
          <SubmitButton
            size="sm"
            variant="secondary"
            name="status"
            value="read"
            pendingLabel="Updating…"
          >
            <MailOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Mark read
          </SubmitButton>
        ) : null}
        {status !== "replied" ? (
          <SubmitButton
            size="sm"
            name="status"
            value="replied"
            pendingLabel="Updating…"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Mark replied
          </SubmitButton>
        ) : null}
      </div>
    </form>
  );
}
