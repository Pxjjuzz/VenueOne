"use client";

import { useActionState } from "react";
import { KeyRound, ArrowRight } from "lucide-react";
import {
  googleSignInAction,
  devSignInAction,
  type AuthActionState,
} from "@/app/auth/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert, Input, Label } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

export type DevAccountOption = {
  email: string;
  label: string;
  fullName: string;
};

const initial: AuthActionState = {};

export function GoogleSignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(googleSignInAction, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
      <SubmitButton
        variant="secondary"
        size="lg"
        className="w-full flex items-center justify-center gap-3 border border-border-strong bg-surface py-3.5 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-secondary hover:border-primary/40 transition-all"
        pendingLabel="Opening Google…"
      >
        <GoogleGlyph />
        Continue with Google
      </SubmitButton>
    </form>
  );
}

export function DevSignInForm({
  next,
  accounts,
}: {
  next: string;
  accounts: DevAccountOption[];
}) {
  const [state, action] = useActionState(devSignInAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      <div className="space-y-1.5">
        <Label htmlFor="dev-email">Development account</Label>
        <Select
          id="dev-email"
          name="email"
          defaultValue={accounts[0]?.email ?? ""}
          required
          options={accounts.map((account) => ({
            value: account.email,
            label: `${account.label} (${account.email})`,
          }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dev-password">Shared development password</Label>
        <Input
          id="dev-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={10}
        />
        <p className="text-xs leading-relaxed text-muted">
          The password is the value of <code className="rounded bg-surface-secondary px-1 py-0.5 text-[0.7rem]">DEV_AUTH_PASSWORD</code> in
          your local environment file.
        </p>
      </div>

      <SubmitButton variant="primary" size="lg" className="w-full" pendingLabel="Signing in…">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        Sign in locally
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.46a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.26a12 12 0 0 0 0 10.74l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
