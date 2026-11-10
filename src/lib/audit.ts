import "server-only";

import { dbQuery } from "@/lib/db";

export type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await dbQuery(
      `insert into audit_logs (actor_id, actor_email, action, entity_type, entity_id, metadata, ip)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        input.actorId ?? null,
        input.actorEmail ?? null,
        input.action,
        input.entityType,
        input.entityId ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.ip ?? null,
      ],
    );
  } catch (error) {
    console.error("Audit log write failed", error);
  }
}
