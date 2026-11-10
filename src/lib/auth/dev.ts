import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { dbQuery } from "@/lib/db";
import { sendGreetingOnLogin } from "@/lib/notifications";
import type { AppRole, OwnerStatus, ProfileRow } from "@/lib/types";

const COOKIE_NAME = "cg_dev_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type DevAccount = {
  email: string;
  fullName: string;
  role: AppRole;
  ownerStatus: OwnerStatus;
  label: string;
};

function envEmail(name: string, fallback: string): string {
  return (process.env[name] || fallback).trim().toLowerCase();
}

export function devAccounts(): DevAccount[] {
  return [
    {
      email: envEmail("DEV_CUSTOMER_EMAIL", "customer@local.test"),
      fullName: "Local Customer",
      role: "customer",
      ownerStatus: "none",
      label: "Customer",
    },
    {
      email: envEmail("DEV_OWNER_EMAIL", "owner@local.test"),
      fullName: "Local Venue Owner",
      role: "owner",
      ownerStatus: "approved",
      label: "Approved owner",
    },
    {
      email: envEmail("DEV_PENDING_OWNER_EMAIL", "pending-owner@local.test"),
      fullName: "Local Pending Owner",
      role: "customer",
      ownerStatus: "none",
      label: "New owner request",
    },
    {
      email: envEmail("DEV_ADMIN_EMAIL", "admin@local.test"),
      fullName: "Local Administrator",
      role: "admin",
      ownerStatus: "none",
      label: "Super Admin",
    },
  ];
}

export function devAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.VERCEL !== "1" &&
    process.env.DEV_AUTH_ENABLED === "true" &&
    (process.env.DEV_AUTH_PASSWORD?.length ?? 0) >= 10 &&
    (process.env.DEV_SESSION_SECRET?.length ?? 0) >= 16
  );
}

function deterministicId(email: string): string {
  const hex = createHmac("sha256", "common-ground-dev-user")
    .update(email)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function ensureDevAccounts(): Promise<void> {
  if (!devAuthEnabled()) return;

  for (const account of devAccounts()) {
    const existing = await dbQuery<ProfileRow>(
      "select * from profiles where lower(email) = $1 limit 1",
      [account.email],
    );

    if (existing.length > 0) {
      const profile = existing[0];
      if (profile.role !== account.role || profile.owner_status !== account.ownerStatus) {
        await dbQuery(
          `update profiles
           set role = $2, owner_status = $3, full_name = coalesce(full_name, $4), updated_at = now()
           where id = $1`,
          [profile.id, account.role, account.ownerStatus, account.fullName],
        );
      }
      continue;
    }

    await dbQuery(
      `insert into profiles (id, email, full_name, role, owner_status)
       values ($1, $2, $3, $4, $5)
       on conflict (email) do nothing`,
      [
        deterministicId(account.email),
        account.email,
        account.fullName,
        account.role,
        account.ownerStatus,
      ],
    );
  }
}

function passwordMatches(candidate: string): boolean {
  const expected = process.env.DEV_AUTH_PASSWORD || "";
  if (!expected || candidate.length > 200) return false;
  const a = Buffer.from(candidate, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(value: string): string {
  return createHmac("sha256", process.env.DEV_SESSION_SECRET || "missing-secret")
    .update(value)
    .digest("base64url");
}

export async function signInDev(emailInput: string, password: string): Promise<boolean> {
  if (!devAuthEnabled()) return false;
  if (!passwordMatches(password)) return false;

  const email = emailInput.trim().toLowerCase();
  const account = devAccounts().find((item) => item.email === email);
  if (!account) return false;

  await ensureDevAccounts();

  const profiles = await dbQuery<ProfileRow>(
    "select * from profiles where lower(email) = $1 limit 1",
    [email],
  );
  if (profiles.length === 0) return false;

  const payload = Buffer.from(
    JSON.stringify({
      sub: profiles[0].id,
      exp: Date.now() + MAX_AGE_SECONDS * 1000,
    }),
    "utf8",
  ).toString("base64url");

  const token = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  sendGreetingOnLogin(profiles[0].id, profiles[0].email, profiles[0].full_name).catch(() => {});
  return true;
}

export async function getDevUserId(): Promise<string | null> {
  if (!devAuthEnabled()) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    if (!parsed.sub || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}

export async function clearDevSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export const DEV_AUTH_COOKIE = COOKIE_NAME;
