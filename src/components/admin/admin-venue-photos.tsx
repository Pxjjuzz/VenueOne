"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImageOff, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";

export type AdminVenuePhotoView = {
  id: string;
  url: string;
  altText: string;
};

function readMessage(payload: unknown, fallback: string): { ok: boolean; message: string } {
  if (payload && typeof payload === "object") {
    const body = payload as { ok?: unknown; message?: unknown; error?: unknown };
    if (body.ok === true) {
      return { ok: true, message: typeof body.message === "string" ? body.message : fallback };
    }
    if (typeof body.error === "string" && body.error) {
      return { ok: false, message: body.error };
    }
  }
  return { ok: false, message: fallback };
}

export function AdminVenuePhotos({
  venueId,
  photos,
  maxPhotos,
}: {
  venueId: string;
  photos: AdminVenuePhotoView[];
  maxPhotos: number;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const atLimit = photos.length >= maxPhotos;

  function submitUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || atLimit) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setSuccess(null);
      setError("Choose a photograph first.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(null);

    const request = new XMLHttpRequest();
    request.open("POST", `/api/admin/venues/${venueId}/photos`);
    request.upload.onprogress = (uploadEvent) => {
      if (uploadEvent.lengthComputable) {
        setProgress(Math.round((uploadEvent.loaded / uploadEvent.total) * 100));
      }
    };
    request.onload = () => {
      setUploading(false);
      let payload: unknown = null;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = null;
      }
      const result = readMessage(payload, "The photograph could not be uploaded.");
      if (request.status >= 200 && request.status < 300 && result.ok) {
        form.reset();
        setProgress(0);
        setSuccess(result.message);
        router.refresh();
        return;
      }
      setError(result.message);
    };
    request.onerror = () => {
      setUploading(false);
      setError("The upload was interrupted. Check your connection and try again.");
    };
    request.send(data);
  }

  async function send(photoId: string, action: "delete" | "up" | "down") {
    if (busy) return;

    if (action === "delete" && !window.confirm("Remove this photograph from the listing?")) {
      return;
    }

    setBusy(`${photoId}:${action}`);
    setError(null);
    setSuccess(null);

    try {
      const response =
        action === "delete"
          ? await fetch(`/api/admin/venues/${venueId}/photos`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoId }),
            })
          : await fetch(`/api/admin/venues/${venueId}/photos`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoId, direction: action }),
            });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      const result = readMessage(payload, "The photograph could not be changed.");
      if (!response.ok || !result.ok) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      router.refresh();
    } catch {
      setError("The change could not be saved. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <FormAlert tone="error">{error}</FormAlert> : null}
      {success ? <FormAlert tone="success">{success}</FormAlert> : null}

      {photos.length === 0 ? (
        <div className="rounded-[var(--radius-sm)] border border-dashed border-border-strong bg-surface-secondary/50 px-4 py-8 text-center">
          <ImageOff className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-foreground">No photographs uploaded</p>
          <p className="mt-1 text-xs text-muted">
            Add at least one photograph before the listing is published.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, index) => {
            const removing = busy === `${photo.id}:delete`;
            const moving = busy === `${photo.id}:up` || busy === `${photo.id}:down`;
            return (
              <li
                key={photo.id}
                className="overflow-hidden rounded-[var(--radius-sm)] border border-border bg-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.altText}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
                <div className="flex items-center gap-1 border-t border-border px-2 py-1.5">
                  <p className="min-w-0 flex-1 truncate text-[0.62rem] text-muted" title={photo.altText}>
                    {photo.altText}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Move ${photo.altText} earlier`}
                    disabled={Boolean(busy) || index === 0}
                    loading={moving && busy?.endsWith(":up")}
                    onClick={() => void send(photo.id, "up")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Move ${photo.altText} later`}
                    disabled={Boolean(busy) || index === photos.length - 1}
                    onClick={() => void send(photo.id, "down")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-error hover:bg-error-soft"
                    aria-label={`Remove ${photo.altText}`}
                    disabled={Boolean(busy)}
                    loading={removing}
                    onClick={() => void send(photo.id, "delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submitUpload} className="space-y-3 border-t border-border pt-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Add a photograph</p>
          <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted">
            JPEG, PNG or WebP, 600 × 400 pixels or larger, up to 8 MB. The server
            resizes each file. {photos.length} of {maxPhotos} used. The first image is
            the public cover.
          </p>
        </div>

        <Field
          label="Photograph"
          htmlFor="venue-photo-file"
          hint="Upload only images you have permission to publish."
        >
          <input
            id="venue-photo-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={uploading || atLimit}
            className="block w-full text-xs text-muted file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:border-primary/40 disabled:cursor-not-allowed"
          />
        </Field>

        <Field label="Alt text" htmlFor="venue-photo-alt" optional hint="Describe the room for screen readers.">
          <Input
            id="venue-photo-alt"
            name="altText"
            maxLength={200}
            placeholder="Function hall with the stage in view"
            disabled={uploading || atLimit}
          />
        </Field>

        {uploading ? (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[0.68rem] text-muted">Uploading {progress}%</p>
          </div>
        ) : null}

        {atLimit ? (
          <p className="text-[0.7rem] leading-relaxed text-muted">
            This venue has reached {maxPhotos} photographs. Remove one to add another.
          </p>
        ) : (
          <Button type="submit" size="sm" loading={uploading} disabled={uploading}>
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Upload photograph
          </Button>
        )}
      </form>
    </div>
  );
}
