import type { Metadata } from "next";
import { ShieldOff } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Account suspended",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountSuspendedPage() {
  const user = await getSessionUser();
  const signedIn = Boolean(user && !user.isSuspended);

  return (
    <div className="container-narrow py-16 sm:py-24">
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center shadow-[var(--shadow-sm)] sm:p-12">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-error-soft text-error">
          <ShieldOff className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">
          This account is suspended
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Access to dashboards, bookings and owner tools is paused for this
          account. Existing records are retained. If you believe this is a
          mistake, contact platform support with the email address on the account.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact" variant="primary">
            Contact support
          </ButtonLink>
          {!signedIn ? (
            <ButtonLink href="/" variant="secondary">
              Return to browsing
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}
