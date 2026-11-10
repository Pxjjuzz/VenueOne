import "server-only";

import { dbQuery } from "@/lib/db";
import {
  DEFAULT_CANCELLATION_POLICY,
  parseCancellationPolicy,
  type CancellationPolicy,
} from "@/lib/policies";

export type PlatformSettings = {
  cancellationPolicy: CancellationPolicy;
  ownerResponseHours: number;
  platformFeePaise: number;
  taxPercent: number;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
  ownerResponseHours: 48,
  platformFeePaise: 0,
  taxPercent: 0,
};

function numberValue(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const rows = await dbQuery<{ key: string; value: unknown }>(
    "select key, value from platform_settings",
  );
  const map = new Map(rows.map((row) => [row.key, row.value]));

  return {
    cancellationPolicy: parseCancellationPolicy(
      map.get("cancellation_policy") ?? DEFAULT_CANCELLATION_POLICY,
    ),
    ownerResponseHours: Math.min(
      168,
      Math.max(1, numberValue(map.get("owner_response_hours"), 48)),
    ),
    platformFeePaise: Math.max(
      0,
      numberValue(map.get("platform_fee_paise"), 0),
    ),
    taxPercent: Math.min(28, Math.max(0, numberValue(map.get("tax_percent"), 0))),
  };
}

export async function setPlatformSetting(
  key: string,
  value: unknown,
  updatedBy: string,
): Promise<void> {
  await dbQuery(
    `insert into platform_settings (key, value, updated_by, updated_at)
     values ($1, $2::jsonb, $3, now())
     on conflict (key) do update
     set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
    [key, JSON.stringify(value), updatedBy],
  );
}
