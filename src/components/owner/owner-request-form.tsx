"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { submitOwnerRequestAction, type SupportActionState } from "@/app/actions/support";
import { Field, FormAlert, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: SupportActionState = {};

export function OwnerRequestForm() {
  const [state, action] = useActionState(submitOwnerRequestAction, initial);

  if (state.success) {
    return (
      <FormAlert tone="success">
        <p className="font-semibold">Application submitted</p>
        <p className="mt-1 leading-relaxed">{state.success}</p>
      </FormAlert>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      <Field
        label="Business, trust or society name"
        htmlFor="owner-business"
        required
        error={state.fieldErrors?.businessName?.[0]}
      >
        <Input id="owner-business" name="businessName" required maxLength={160} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact phone" htmlFor="owner-phone" required error={state.fieldErrors?.contactPhone?.[0]}>
          <Input id="owner-phone" name="contactPhone" type="tel" autoComplete="tel" required maxLength={24} />
        </Field>
        <Field label="PIN code" htmlFor="owner-pincode" required error={state.fieldErrors?.pincode?.[0]}>
          <Input id="owner-pincode" name="pincode" inputMode="numeric" pattern="\d{6}" maxLength={6} required />
        </Field>
      </div>

      <Field label="Address" htmlFor="owner-address" required error={state.fieldErrors?.address?.[0]}>
        <Input id="owner-address" name="address" autoComplete="street-address" required maxLength={300} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="owner-city" required error={state.fieldErrors?.city?.[0]}>
          <Input id="owner-city" name="city" autoComplete="address-level2" required maxLength={80} />
        </Field>
        <Field label="State" htmlFor="owner-state" required error={state.fieldErrors?.state?.[0]}>
          <Input id="owner-state" name="state" autoComplete="address-level1" required maxLength={80} />
        </Field>
      </div>

      <Field
        label="Ownership notes"
        htmlFor="owner-notes"
        optional
        hint="Describe your relationship to the venue, any registration details, and how the venue is usually used."
        error={state.fieldErrors?.ownershipNotes?.[0]}
      >
        <Textarea id="owner-notes" name="ownershipNotes" rows={4} maxLength={2000} />
      </Field>

      <SubmitButton pendingLabel="Submitting application…">
        Apply for owner access
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}
