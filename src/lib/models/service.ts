import "server-only";

import { recordAudit } from "@/lib/audit";
import { dbQuery } from "@/lib/db";
import { validateStatusChange } from "@/lib/models/status";
import type { VenueModelAccuracy, VenueModelRow, VenueModelStatus } from "@/lib/types";

export { MODEL_STATUS_TRANSITIONS, canTransition } from "@/lib/models/status";

export type ModelActor = { id: string; email: string };

export async function saveModelMetadata(input: {
  venueId: string;
  accuracy: VenueModelAccuracy;
  notes: string;
  actor: ModelActor;
}): Promise<VenueModelRow | null> {
  const rows = await dbQuery<VenueModelRow>(
    `update venue_models
     set accuracy = $2, notes = $3, updated_at = now()
     where venue_id = $1 and status <> 'not_available'
     returning *`,
    [input.venueId, input.accuracy, input.notes.slice(0, 4000)],
  );
  if (!rows[0]) return null;

  await recordAudit({
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: "venue_model.metadata",
    entityType: "venue_model",
    entityId: rows[0].id,
    metadata: { venueId: input.venueId, accuracy: input.accuracy },
  });
  return rows[0];
}

export async function setModelStatus(input: {
  venueId: string;
  status: VenueModelStatus;
  rejectionReason?: string;
  actor: ModelActor;
}): Promise<{ model: VenueModelRow | null; error: string | null }> {
  const current = await dbQuery<VenueModelRow>(
    "select * from venue_models where venue_id = $1",
    [input.venueId],
  );
  const row = current[0];
  if (!row) return { model: null, error: "This venue has no 3D model record yet." };

  const check = validateStatusChange({
    from: row.status,
    to: input.status,
    hasFile: Boolean(row.storage_path),
    rejectionReason: input.rejectionReason,
  });
  if (!check.ok) return { model: null, error: check.error };
  if (row.status === input.status) return { model: row, error: null };

  const rows = await dbQuery<VenueModelRow>(
    `update venue_models
     set status = $2,
         rejection_reason = case when $2 = 'rejected' then $3 else null end,
         reviewed_by = $4,
         reviewed_at = now(),
         published_at = case when $2 = 'published' then now() else published_at end,
         updated_at = now()
     where venue_id = $1
     returning *`,
    [input.venueId, input.status, input.rejectionReason?.slice(0, 500) ?? null, input.actor.id],
  );
  if (!rows[0]) return { model: null, error: "The model status could not be saved." };

  await recordAudit({
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: input.status === "published" ? "venue_model.publish" : "venue_model.status",
    entityType: "venue_model",
    entityId: rows[0].id,
    metadata: { venueId: input.venueId, from: row.status, to: input.status },
  });
  return { model: rows[0], error: null };
}
