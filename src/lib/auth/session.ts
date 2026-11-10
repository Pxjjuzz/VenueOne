import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { dbQuery } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { sendGreetingOnLogin } from "@/lib/notifications";
import { signInPath } from "@/lib/navigation";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { devAuthEnabled, getDevUserId } from "./dev";
import type { AppRole, OwnerStatus, ProfileRow } from "@/lib/types";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  role: AppRole;
  ownerStatus: OwnerStatus;
  isSuspended: boolean;
  isDemo: boolean;
};

function toSessionUser(profile: ProfileRow, isDemo: boolean): SessionUser {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    phone: profile.phone,
    role: profile.role,
    ownerStatus: profile.owner_status,
    isSuspended: profile.is_suspended,
    isDemo,
  };
}

function bootstrapEmails(): string[] {
  return (process.env.ADMIN_BOOTSTRAP_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function syncSupabaseProfile(user: User): Promise<ProfileRow | null> {
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    null;
  const avatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    null;

  const existing = await dbQuery<ProfileRow>("select * from profiles where id = $1", [user.id]);

  if (existing.length > 0) {
    const profile = existing[0];
    const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
    const shouldBootstrapAdmin =
      emailVerified && bootstrapEmails().includes(email) && profile.role !== "admin";

    if (shouldBootstrapAdmin) {
      const updated = await dbQuery<ProfileRow>(
        `update profiles set role = 'admin', updated_at = now()
         where id = $1 returning *`,
        [user.id],
      );
      await recordAudit({
        actorId: user.id,
        actorEmail: email,
        action: "admin.bootstrap",
        entityType: "profile",
        entityId: user.id,
        metadata: { via: "ADMIN_BOOTSTRAP_EMAILS" },
      });
      return updated[0] ?? profile;
    }

    await dbQuery(
      `update profiles
       set email = $2,
           full_name = coalesce(full_name, $3),
           avatar_url = coalesce($4, avatar_url),
           updated_at = now()
       where id = $1`,
      [user.id, email, fullName, avatarUrl],
    );

    const refreshed = await dbQuery<ProfileRow>("select * from profiles where id = $1", [user.id]);
    const finalProfile = refreshed[0] ?? profile;
    try {
      await sendGreetingOnLogin(finalProfile.id, finalProfile.email, finalProfile.full_name);
    } catch (err) {
      console.error("[Session] Error sending greeting email:", err);
    }
    return finalProfile;
  }

  const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
  const isBootstrapAdmin = emailVerified && bootstrapEmails().includes(email);

  const conflict = await dbQuery<ProfileRow>(
    "select * from profiles where lower(email) = $1 limit 1",
    [email],
  );
  if (conflict.length > 0) {
    console.error("Profile email exists under a different auth user id", { email });
    return conflict[0];
  }

  const inserted = await dbQuery<ProfileRow>(
    `insert into profiles (id, email, full_name, avatar_url, role)
     values ($1, $2, $3, $4, $5)
     on conflict (id) do update set email = excluded.email
     returning *`,
    [user.id, email, fullName, avatarUrl, isBootstrapAdmin ? "admin" : "customer"],
  );

  if (isBootstrapAdmin) {
    await recordAudit({
      actorId: user.id,
      actorEmail: email,
      action: "admin.bootstrap",
      entityType: "profile",
      entityId: user.id,
      metadata: { via: "ADMIN_BOOTSTRAP_EMAILS", created: true },
    });
  }

  if (inserted[0]) {
    try {
      await sendGreetingOnLogin(inserted[0].id, inserted[0].email, inserted[0].full_name);
    } catch (err) {
      console.error("[Session] Error sending greeting email:", err);
    }
  }

  return inserted[0] ?? null;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (devAuthEnabled()) {
    const devId = await getDevUserId();
    if (devId) {
      const profiles = await dbQuery<ProfileRow>("select * from profiles where id = $1", [devId]);
      if (profiles.length > 0) return toSessionUser(profiles[0], true);
    }
  }

  if (!isSupabaseConfigured()) return null;

  try {
    const cookieStore = await cookies();
    const hasAuthCookie = cookieStore
      .getAll()
      .some((c) => c.name.includes("-auth-token") || (c.name.startsWith("sb-") && c.name.endsWith("-token")));

    // Quick exit: anonymous visitor has no session cookies, avoid remote API hop
    if (!hasAuthCookie) return null;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Fast path: load profile directly without performing writes on read requests
    const existing = await dbQuery<ProfileRow>("select * from profiles where id = $1 limit 1", [user.id]);
    if (existing[0]) {
      return toSessionUser(existing[0], false);
    }

    // Fallback: sync profile only if not yet present in database
    const profile = await syncSupabaseProfile(user);
    return profile ? toSessionUser(profile, false) : null;
  } catch (error) {
    console.error("Session lookup failed", error);
    return null;
  }
});

export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(signInPath(next));
  if (user.isSuspended) redirect("/account-suspended");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") notFound();
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser("/owner");
  if (user.role !== "owner" || user.ownerStatus !== "approved") {
    redirect("/owner/status");
  }
  return user;
}

export async function requireOwnerApplicant(): Promise<SessionUser> {
  return requireUser("/owner/status");
}
