"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateProfileAction, type AccountActionState } from "@/app/actions/account";
import { Field, FormAlert, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: AccountActionState = {};

export function ProfileForm({
  fullName,
  phone,
}: {
  fullName: string | null;
  phone: string | null;
}) {
  const [state, action] = useActionState(updateProfileAction, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}

      <Field label="Full name" htmlFor="profile-name" required error={state.fieldErrors?.fullName?.[0]}>
        <Input
          id="profile-name"
          name="fullName"
          defaultValue={fullName ?? ""}
          autoComplete="name"
          required
          maxLength={120}
        />
      </Field>

      <Field
        label="Phone"
        htmlFor="profile-phone"
        optional
        hint="Shared with the venue only after a booking request is made."
        error={state.fieldErrors?.phone?.[0]}
      >
        <Input
          id="profile-phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          autoComplete="tel"
          maxLength={24}
        />
      </Field>

      <SubmitButton pendingLabel="Saving…">
        <Save className="h-4 w-4" aria-hidden="true" />
        Save profile
      </SubmitButton>
    </form>
  );
}
