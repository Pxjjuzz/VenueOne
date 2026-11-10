"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createVenueDraftAction, type OwnerActionState } from "@/app/actions/owner";
import { FormAlert } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button";

const initial: OwnerActionState = {};

export function CreateVenueForm({
  label = "Create a venue",
  variant = "primary",
  size = "sm",
}: {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [state, action] = useActionState(createVenueDraftAction, initial);

  return (
    <form action={action} className="space-y-2">
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      <SubmitButton variant={variant} size={size} pendingLabel="Creating draft…">
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label}
      </SubmitButton>
    </form>
  );
}
