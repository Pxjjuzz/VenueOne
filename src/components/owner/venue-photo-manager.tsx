"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import {
  moveVenuePhotoAction,
  removeVenuePhotoAction,
  uploadVenuePhotoAction,
  type OwnerActionState,
} from "@/app/actions/owner";
import { Field, FormAlert, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";

const initial: OwnerActionState = {};

export type OwnerPhoto = {
  id: string;
  url: string;
  alt: string;
};

function PhotoAdminRow({
  venueId,
  photo,
  index,
  total,
}: {
  venueId: string;
  photo: OwnerPhoto;
  index: number;
  total: number;
}) {
  const [moveState, moveAction] = useActionState(moveVenuePhotoAction, initial);
  const [removeState, removeAction] = useActionState(removeVenuePhotoAction, initial);
  const router = useRouter();
  const previous = useRef("");

  useEffect(() => {
    const marker = `${moveState.success ?? ""}${removeState.success ?? ""}`;
    if (marker && marker !== previous.current) {
      previous.current = marker;
      router.refresh();
    }
  }, [moveState.success, removeState.success, router]);

  return (
    <li className="flex gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.alt} className="h-20 w-24 shrink-0 rounded-[var(--radius-xs)] object-cover" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">
          {index === 0 ? "Cover photograph" : `Photograph ${index + 1}`}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[0.68rem] text-muted">{photo.alt}</p>
        {moveState.error || removeState.error ? (
          <p className="mt-1 text-[0.68rem] text-error">{moveState.error ?? removeState.error}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <form action={moveAction}>
            <input type="hidden" name="venueId" value={venueId} />
            <input type="hidden" name="photoId" value={photo.id} />
            <input type="hidden" name="direction" value="up" />
            <Button type="submit" variant="ghost" size="sm" disabled={index === 0} aria-label="Move photograph up">
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </form>
          <form action={moveAction}>
            <input type="hidden" name="venueId" value={venueId} />
            <input type="hidden" name="photoId" value={photo.id} />
            <input type="hidden" name="direction" value="down" />
            <Button type="submit" variant="ghost" size="sm" disabled={index === total - 1} aria-label="Move photograph down">
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </form>
          <form
            action={removeAction}
            onSubmit={(event) => {
              if (!window.confirm("Remove this photograph? This cannot be undone.")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="venueId" value={venueId} />
            <input type="hidden" name="photoId" value={photo.id} />
            <Button type="submit" variant="ghost" size="sm" className="text-error hover:bg-error-soft" aria-label="Remove photograph">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </Button>
          </form>
        </div>
      </div>
    </li>
  );
}

export function VenuePhotoManager({
  venueId,
  photos,
  canUpload,
}: {
  venueId: string;
  photos: OwnerPhoto[];
  canUpload: boolean;
}) {
  const [state, action] = useActionState(uploadVenuePhotoAction, initial);
  const router = useRouter();
  const previous = useRef("");

  useEffect(() => {
    if (state.success && state.success !== previous.current) {
      previous.current = state.success;
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="space-y-4">
      {photos.length === 0 ? (
        <div className="rounded-[var(--radius-sm)] border border-dashed border-border-strong bg-surface-secondary/50 px-4 py-6 text-center">
          <ImagePlus className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-foreground">No photographs yet</p>
          <p className="mt-1 text-xs text-muted">At least one photograph is required before submission.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {photos.map((photo, index) => (
            <PhotoAdminRow
              key={photo.id}
              venueId={venueId}
              photo={photo}
              index={index}
              total={photos.length}
            />
          ))}
        </ul>
      )}

      {canUpload ? (
        <form action={action} className="space-y-3 rounded-[var(--radius-sm)] border border-border bg-surface-secondary/40 p-3.5">
          <input type="hidden" name="venueId" value={venueId} />
          <p className="text-xs font-semibold text-foreground">Add a photograph</p>
          {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}
          {state.success ? <FormAlert tone="success">{state.success}</FormAlert> : null}
          <Field
            label="Image file"
            htmlFor="venue-photo"
            hint="JPEG, PNG or WebP, at least 600 × 400 pixels and no larger than 8 MB. The server resizes it to WebP."
          >
            <Input
              id="venue-photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="h-auto py-2"
            />
          </Field>
          <Field label="Alt text" htmlFor="venue-photo-alt" optional hint="Describe the photograph for screen readers.">
            <Input id="venue-photo-alt" name="altText" maxLength={200} />
          </Field>
          <SubmitButton size="sm" pendingLabel="Uploading…">
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            Upload photograph
          </SubmitButton>
        </form>
      ) : (
        <p className="rounded-[var(--radius-sm)] border border-border bg-surface-secondary/60 px-3.5 py-3 text-xs text-muted">
          This venue already has the maximum number of photographs. Remove one to upload
          another.
        </p>
      )}
    </div>
  );
}
