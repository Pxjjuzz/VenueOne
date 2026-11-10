import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { GoogleSignInForm } from "@/components/auth/sign-in-form";
import { BrandMark } from "@/components/brand-mark";
import { getSessionUser } from "@/lib/auth/session";
import { dashboardHome, safeNextPath } from "@/lib/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in — VenueOne",
  description: "Sign in to VenueOne to manage bookings, venues and account details.",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/dashboard");
  const user = await getSessionUser();

  if (user) redirect(dashboardHome(user.role, user.ownerStatus));

  const googleEnabled = isSupabaseConfigured();

  return (
    <div className="container-page flex min-h-[calc(100vh-var(--header-height)-120px)] items-center justify-center py-12 sm:py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface p-7 shadow-lg sm:p-9">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to browsing
        </Link>

        <div className="mt-6 text-center">
          <div className="inline-block">
            <BrandMark />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground">
            Sign in to VenueOne
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Access your bookings, reservations, and venue management with your Google account.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {googleEnabled ? (
            <GoogleSignInForm next={next} />
          ) : (
            <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-xs leading-relaxed text-warning">
              <p className="font-semibold text-warning-strong">Google OAuth Configuration Needed</p>
              <p className="mt-1">
                Please add <code className="rounded bg-white/60 px-1 py-0.5 font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="rounded bg-white/60 px-1 py-0.5 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your{" "}
                <code className="rounded bg-white/60 px-1 py-0.5 font-mono">.env.local</code> file to enable Google sign-in.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Encrypted authentication via Google OAuth</span>
          </div>

          <p className="mt-4 text-[0.7rem] leading-relaxed text-muted">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="font-medium text-primary underline underline-offset-4">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
