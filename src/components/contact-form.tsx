"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { contactAction, type SupportActionState } from "@/app/actions/support";
import { Field, FormAlert, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: SupportActionState = {};

export function ContactForm() {
  const [state, action] = useActionState(contactAction, initial);

  if (state.success) {
    return (
      <FormAlert tone="success" className="text-sm">
        <p className="font-semibold">Message received</p>
        <p className="mt-1 leading-relaxed">{state.success}</p>
      </FormAlert>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="contact-name" required error={state.fieldErrors?.name?.[0]}>
          <Input id="contact-name" name="name" autoComplete="name" required maxLength={120} />
        </Field>
        <Field label="Email" htmlFor="contact-email" required error={state.fieldErrors?.email?.[0]}>
          <Input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} />
        </Field>
      </div>

      <Field label="Subject" htmlFor="contact-subject" required error={state.fieldErrors?.subject?.[0]}>
        <Input id="contact-subject" name="subject" required maxLength={160} />
      </Field>

      <Field
        label="Message"
        htmlFor="contact-message"
        required
        hint="Include booking references or venue names where relevant. Do not send payment credentials."
        error={state.fieldErrors?.message?.[0]}
      >
        <Textarea id="contact-message" name="message" required minLength={20} maxLength={4000} rows={6} />
      </Field>

      <SubmitButton pendingLabel="Sending…">
        <Send className="h-4 w-4" aria-hidden="true" />
        Send message
      </SubmitButton>
    </form>
  );
}
