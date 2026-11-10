"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { clearDevSession, devAuthEnabled, signInDev } from "@/lib/auth/dev";
import { safeNextPath } from "@/lib/navigation";
import { limitByIp } from "@/lib/rate-limit";

export type AuthActionState = { error?: string };

export async function googleSignInAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const next = safeNextPath(formData.get("next"), "/dashboard");

  if (!isSupabaseConfigured()) {
    return {
      error:
        "Google sign-in is not configured on this environment. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
    };
  }

  const headerStore = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    headerStore.get("origin") ||
    "http://localhost:3000";

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    console.error("Google sign-in initiation failed", error?.message);
    return { error: "Google sign-in could not be started. Please try again." };
  }

  redirect(data.url);
}

export async function devSignInAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!devAuthEnabled()) {
    return { error: "Local development sign-in is disabled." };
  }

  const rate = await limitByIp("dev-sign-in", 12, 60);
  if (!rate.ok) {
    return { error: "Too many attempts. Wait a minute and try again." };
  }

  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = safeNextPath(formData.get("next"), "/dashboard");

  if (!(await signInDev(email, password))) {
    return { error: "That development account or password is not valid." };
  }

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    }
  } catch (error) {
    console.error("Sign out failed", error);
  }
  await clearDevSession();
  redirect("/");
}
