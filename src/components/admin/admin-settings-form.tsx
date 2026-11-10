"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { settingsAction, type AdminActionState } from "@/app/actions/admin";
import {
  Field,
  Fieldset,
  FormAlert,
  Input,
  Textarea,
} from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { PlatformSettings } from "@/lib/settings";

const initial: AdminActionState = {};

export function AdminSettingsForm({ settings }: { settings: PlatformSettings }) {
  const [state, action] = useActionState(settingsAction, initial);
  const policy = settings.cancellationPolicy;

  return (
    <form action={action} className="space-y-8">
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}

      <Fieldset
        legend="Booking and fees"
        description="Applied to new bookings. Existing bookings keep the snapshot recorded when they were created."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Owner response window (hours)" htmlFor="owner-response-hours">
            <Input
              id="owner-response-hours"
              name="ownerResponseHours"
              type="number"
              min={1}
              max={168}
              defaultValue={settings.ownerResponseHours}
              required
            />
          </Field>
          <Field
            label="Platform fee (₹)"
            htmlFor="platform-fee"
            hint="Added to each booking subtotal."
          >
            <Input
              id="platform-fee"
              name="platformFeeRupees"
              type="number"
              min={0}
              step="0.01"
              defaultValue={(settings.platformFeePaise / 100).toString()}
              required
            />
          </Field>
          <Field label="Tax (%)" htmlFor="tax-percent" hint="Applied after the platform fee.">
            <Input
              id="tax-percent"
              name="taxPercent"
              type="number"
              min={0}
              max={28}
              step="0.01"
              defaultValue={settings.taxPercent}
              required
            />
          </Field>
        </div>
      </Fieldset>

      <Fieldset
        legend="Cancellation policy"
        description="The policy is snapshotted into each new booking. Changes do not rewrite existing bookings or approved refunds."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Cancellation deadline (hours before start)"
            htmlFor="deadline-hours"
            hint="Requests close this many hours before the booking starts."
          >
            <Input
              id="deadline-hours"
              name="cancellationDeadlineHours"
              type="number"
              min={0}
              max={720}
              defaultValue={policy.cancellationDeadlineHours}
              required
            />
          </Field>
          <Field
            label="Full refund window (hours before start)"
            htmlFor="full-refund-hours"
            hint="Cancellations at or before this point receive the full refund percentage."
          >
            <Input
              id="full-refund-hours"
              name="fullRefundHours"
              type="number"
              min={1}
              max={2160}
              defaultValue={policy.fullRefundHours}
              required
            />
          </Field>
          <Field
            label="Partial refund window (hours before start)"
            htmlFor="partial-refund-hours"
            hint="Between this point and the full-refund window, the partial percentage applies."
          >
            <Input
              id="partial-refund-hours"
              name="partialRefundHours"
              type="number"
              min={0}
              max={2160}
              defaultValue={policy.partialRefundHours}
              required
            />
          </Field>
          <Field label="Partial refund percentage" htmlFor="partial-refund-percent">
            <Input
              id="partial-refund-percent"
              name="partialRefundPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={policy.partialRefundPercent}
              required
            />
          </Field>
        </div>
        <Field
          label="Customer-facing notes"
          htmlFor="policy-notes"
          optional
          hint="Short plain-text notes shown with the policy explanation."
        >
          <Textarea
            id="policy-notes"
            name="notes"
            rows={3}
            maxLength={1000}
            defaultValue={policy.notes}
          />
        </Field>
      </Fieldset>

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted">
          Platform fees and tax are stored in integer paise. The cancellation policy is
          applied only when a booking is created.
        </p>
        <SubmitButton pendingLabel="Saving settings…">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save settings
        </SubmitButton>
      </div>
    </form>
  );
}
