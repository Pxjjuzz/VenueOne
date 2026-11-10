import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { dbQuery } from "@/lib/db";

export async function getRequestIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return store.get("x-real-ip") || "unknown";
}

export function rateKey(scope: string, identifier: string): string {
  return createHash("sha256").update(`${scope}:${identifier}`).digest("hex").slice(0, 48);
}

export async function consumeRateLimit(input: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  try {
    const rows = await dbQuery<{ count: number }>(
      `insert into rate_limits (key, window_start, count)
       values (
         $1,
         to_timestamp(floor(extract(epoch from now()) / $2::numeric) * $2::numeric),
         1
       )
       on conflict (key, window_start)
       do update set count = rate_limits.count + 1
       returning count`,
      [input.key, input.windowSeconds],
    );
    const count = rows[0]?.count ?? 1;
    return {
      ok: count <= input.limit,
      retryAfterSeconds: input.windowSeconds,
    };
  } catch (error) {
    console.error("Rate limit check failed", error);
    // Fail closed for sensitive endpoints if the limiter itself is unavailable.
    return { ok: false, retryAfterSeconds: 60 };
  }
}

export async function limitByIp(scope: string, limit: number, windowSeconds: number) {
  const ip = await getRequestIp();
  return consumeRateLimit({
    key: rateKey(scope, ip),
    limit,
    windowSeconds,
  });
}

export async function limitByUser(
  scope: string,
  userId: string,
  limit: number,
  windowSeconds: number,
) {
  return consumeRateLimit({
    key: rateKey(scope, userId),
    limit,
    windowSeconds,
  });
}
