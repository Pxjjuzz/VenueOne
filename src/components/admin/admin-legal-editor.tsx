"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { legalPageAction, type AdminActionState } from "@/app/actions/admin";
import { Field, FormAlert, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

const initial: AdminActionState = {};

export function AdminLegalEditor({
  page,
}: {
  page: {
    slug: string;
    title: string;
    contentMd: string;
    requiresLegalReview: boolean;
  };
}) {
  const [state, action] = useActionState(legalPageAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={page.slug} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}

      <Field label="Page title" htmlFor={`legal-title-${page.slug}`} required>
        <Input
          id={`legal-title-${page.slug}`}
          name="title"
          defaultValue={page.title}
          maxLength={120}
          required
        />
      </Field>

      <Field
        label="Content (Markdown)"
        htmlFor={`legal-content-${page.slug}`}
        required
        hint="Plain Markdown. Placeholders are rendered as written and should be replaced before launch."
      >
        <Textarea
          id={`legal-content-${page.slug}`}
          name="contentMd"
          rows={22}
          maxLength={100000}
          defaultValue={page.contentMd}
          required
          className="font-mono text-xs leading-relaxed"
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-warning/30 bg-warning-soft p-3.5">
        <input
          type="checkbox"
          name="requiresLegalReview"
          defaultChecked={page.requiresLegalReview}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] accent-[var(--primary)]"
        />
        <span>
          <span className="block text-sm font-medium text-warning">
            This page still requires legal review
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-warning">
            While checked, the public page shows a visible draft notice. Uncheck only
            after a qualified person has reviewed and approved the final text.
          </span>
        </span>
      </label>

      <div className="flex justify-end border-t border-border pt-4">
        <SubmitButton pendingLabel="Saving page…">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save legal page
        </SubmitButton>
      </div>
    </form>
  );
}
