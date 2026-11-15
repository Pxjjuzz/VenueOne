import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import {
  addVenuePhotoAsAdmin,
  deleteVenuePhotoAsAdmin,
  moveVenuePhotoAsAdmin,
  type AdminPhotoActor,
} from "@/lib/admin/venue-photos";
import { MAX_PHOTO_BYTES } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = MAX_PHOTO_BYTES + 1024 * 1024;

const photoIdSchema = z.string().uuid();
const moveSchema = z.object({
  photoId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Route handlers do not get the origin check that server actions have, so a
 * cross-site request carrying a session cookie has to be refused here.
 */
function isSameOrigin(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function authorize(
  request: Request,
  params: Promise<{ id: string }>,
): Promise<{ actor: AdminPhotoActor; venueId: string } | Response> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin" || user.isSuspended) {
    return json({ error: "Administrator access is required." }, 403);
  }
  if (!isSameOrigin(request)) {
    return json({ error: "This change did not come from the admin panel." }, 403);
  }

  const { id } = await params;
  if (!photoIdSchema.safeParse(id).success) {
    return json({ error: "That venue does not exist." }, 404);
  }

  return { actor: { id: user.id, email: user.email }, venueId: id };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorize(request, params);
  if (access instanceof Response) return access;

  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "That photograph is too large. Use a file of 8 MB or less." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "The upload could not be read. Try a smaller file." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json({ error: "Choose a photograph to upload." }, 400);
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return json({ error: "Each photograph must be 8 MB or smaller." }, 413);
  }

  const result = await addVenuePhotoAsAdmin({
    venueId: access.venueId,
    actor: access.actor,
    file,
    altText: String(form.get("altText") ?? ""),
  });

  if (!result.ok) return json({ error: result.error }, 400);

  revalidatePath(`/admin/venues/${access.venueId}`);
  return json({ ok: true, message: result.message });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorize(request, params);
  if (access instanceof Response) return access;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "The request could not be read." }, 400);
  }

  const parsed = photoIdSchema.safeParse((body as { photoId?: unknown })?.photoId);
  if (!parsed.success) return json({ error: "Choose a photograph to remove." }, 400);

  const result = await deleteVenuePhotoAsAdmin({
    venueId: access.venueId,
    actor: access.actor,
    photoId: parsed.data,
  });

  if (!result.ok) return json({ error: result.error }, 400);

  revalidatePath(`/admin/venues/${access.venueId}`);
  return json({ ok: true, message: result.message });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorize(request, params);
  if (access instanceof Response) return access;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "The request could not be read." }, 400);
  }

  const parsed = moveSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Choose a photograph and a direction." }, 400);

  const result = await moveVenuePhotoAsAdmin({
    venueId: access.venueId,
    actor: access.actor,
    photoId: parsed.data.photoId,
    direction: parsed.data.direction,
  });

  if (!result.ok) return json({ error: result.error }, 400);

  revalidatePath(`/admin/venues/${access.venueId}`);
  return json({ ok: true, message: result.message });
}
