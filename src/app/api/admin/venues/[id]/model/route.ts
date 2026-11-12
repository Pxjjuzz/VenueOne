import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { getSessionUser } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db";
import {
  MAX_MODEL_BYTES,
  ModelValidationError,
  inspectGlb,
  modelPreviewPath,
  modelStoragePath,
  storeModelFile,
  storeModelPreview,
} from "@/lib/models/storage";
import { processVenueImage } from "@/lib/storage";
import type { VenueModelRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const accuracySchema = z.enum(["conceptual", "approximate", "verified"]);
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;
// Model, preview, and multipart overhead. Refusing a larger body before parsing
// keeps a hostile request from being buffered in full.
const MAX_BODY_BYTES = MAX_MODEL_BYTES + MAX_PREVIEW_BYTES + 1024 * 1024;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Route handlers do not get the origin check that server actions have. This
 * endpoint accepts a session cookie and a large body, so a cross-site POST has
 * to be refused here rather than relied on being impossible.
 */
function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || user.isSuspended) {
    return json({ error: "Administrator access is required." }, 403);
  }

  if (!isSameOrigin(request)) {
    return json({ error: "This upload did not come from the admin panel." }, 403);
  }

  const { id: venueId } = await params;

  const venue = await dbQuery<{ id: string; name: string }>(
    "select id, name from venues where id = $1",
    [venueId],
  );
  if (!venue[0]) return json({ error: "That venue does not exist." }, 404);

  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "That upload is too large. The model must be 40 MB or smaller." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "The upload could not be read. Try a smaller file." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json({ error: "Choose a .glb file to upload." }, 400);
  }
  if (file.size > MAX_MODEL_BYTES) {
    return json({ error: "The model must be 40 MB or smaller." }, 413);
  }

  const accuracy = accuracySchema.safeParse(String(form.get("accuracy") ?? "conceptual"));
  if (!accuracy.success) return json({ error: "Choose a valid accuracy level." }, 400);

  const notes = String(form.get("notes") ?? "").trim().slice(0, 4000);

  const preview = form.get("preview");
  if (preview instanceof File && preview.size > MAX_PREVIEW_BYTES) {
    return json({ error: "The preview image must be 8 MB or smaller." }, 413);
  }

  let glb: Buffer;
  try {
    glb = Buffer.from(await file.arrayBuffer());
  } catch {
    return json({ error: "The file could not be read." }, 400);
  }

  let summary;
  try {
    summary = inspectGlb(glb);
  } catch (error) {
    if (error instanceof ModelValidationError) return json({ error: error.message }, 400);
    return json({ error: "The model could not be validated." }, 400);
  }

  const existing = await dbQuery<Pick<VenueModelRow, "version" | "status">>(
    "select version, status from venue_models where venue_id = $1",
    [venueId],
  );
  const version = existing[0] ? existing[0].version + 1 : 1;

  let storagePath: string;
  try {
    storagePath = modelStoragePath(venueId, version);
    await storeModelFile(storagePath, glb);
  } catch (error) {
    if (error instanceof ModelValidationError) return json({ error: error.message }, 400);
    console.error("Model upload failed", error);
    return json({ error: "The model could not be stored. Try again." }, 500);
  }

  // A preview is optional. When the admin supplies one it is normalised to WebP.
  let previewPath: string | null = null;
  if (preview instanceof File && preview.size > 0) {
    try {
      const image = await processVenueImage(Buffer.from(await preview.arrayBuffer()));
      previewPath = modelPreviewPath(venueId, version);
      await storeModelPreview(previewPath, image.buffer);
    } catch (error) {
      console.error("Model preview upload failed", error);
      previewPath = null;
    }
  }

  // Replacing a published file always returns the row to draft. A new file must
  // never appear to customers before an administrator reviews it.
  const rows = await dbQuery<VenueModelRow>(
    `insert into venue_models
       (venue_id, storage_path, preview_path, status, accuracy, version, file_bytes, notes,
        uploaded_by, uploaded_at)
     values ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, now())
     on conflict (venue_id) do update set
       storage_path = excluded.storage_path,
       preview_path = excluded.preview_path,
       status = 'draft',
       accuracy = excluded.accuracy,
       version = excluded.version,
       file_bytes = excluded.file_bytes,
       notes = excluded.notes,
       uploaded_by = excluded.uploaded_by,
       uploaded_at = now(),
       reviewed_by = null,
       reviewed_at = null,
       published_at = null,
       rejection_reason = null,
       updated_at = now()
     returning *`,
    [
      venueId,
      storagePath,
      previewPath,
      accuracy.data,
      version,
      summary.bytes,
      notes,
      user.id,
    ],
  );

  if (!rows[0]) return json({ error: "The model record could not be saved." }, 500);

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "venue_model.upload",
    entityType: "venue_model",
    entityId: rows[0].id,
    metadata: {
      venueId,
      version,
      bytes: summary.bytes,
      triangles: summary.triangles,
      accuracy: accuracy.data,
      generator: summary.generator,
    },
  });

  revalidatePath(`/admin/venues/${venueId}`);
  revalidatePath("/admin/venues");

  return json({
    ok: true,
    version,
    triangles: summary.triangles,
    bytes: summary.bytes,
    meshes: summary.meshes,
  });
}
