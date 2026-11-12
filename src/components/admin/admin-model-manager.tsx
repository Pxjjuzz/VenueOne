"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  CheckCircle2,
  EyeOff,
  RefreshCw,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
import {
  venueModelMetadataAction,
  venueModelStatusAction,
  type AdminActionState,
} from "@/app/actions/admin";
import { Field, FormAlert, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { VenueModelExperience } from "@/components/venue-3d/venue-model-experience";
import { formatDateTime } from "@/lib/format";
import {
  VENUE_MODEL_ACCURACY_LABELS,
  VENUE_MODEL_STATUS_LABELS,
  venueModelAccuracyTone,
  venueModelStatusTone,
  type VenueModelAccuracy,
  type VenueModelStatus,
} from "@/lib/types";

const initial: AdminActionState = {};

const ACCURACY_OPTIONS = (
  Object.keys(VENUE_MODEL_ACCURACY_LABELS) as VenueModelAccuracy[]
).map((value) => ({ value, label: VENUE_MODEL_ACCURACY_LABELS[value] }));

export type AdminModelSnapshot = {
  status: VenueModelStatus;
  accuracy: VenueModelAccuracy;
  version: number;
  fileBytes: number | null;
  notes: string;
  uploadedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  rejectionReason: string | null;
};

function fileSize(bytes: number | null): string {
  if (!bytes) return "unknown size";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminModelManager({
  venueId,
  venueName,
  model,
  modelUrl,
  posterUrl,
}: {
  venueId: string;
  venueName: string;
  model: AdminModelSnapshot | null;
  modelUrl: string | null;
  posterUrl: string | null;
}) {
  const router = useRouter();
  const [metaState, metaAction] = useActionState(venueModelMetadataAction, initial);
  const [statusState, statusAction] = useActionState(venueModelStatusAction, initial);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Each completed action returns a fresh state object. Refreshing on identity,
  // not on the message text, keeps repeated messages working.
  const lastRefresh = useRef<AdminActionState | null>(null);
  useEffect(() => {
    const latest = statusState.success ? statusState : metaState.success ? metaState : null;
    if (latest && latest !== lastRefresh.current) {
      lastRefresh.current = latest;
      router.refresh();
    }
  }, [metaState, statusState, router]);

  function submitUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setUploadError("Choose a .glb file first.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    const request = new XMLHttpRequest();
    request.open("POST", `/api/admin/venues/${venueId}/model`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      setUploading(false);
      let payload: { error?: string; version?: number; triangles?: number } = {};
      try {
        payload = JSON.parse(request.responseText) as typeof payload;
      } catch {
        payload = {};
      }
      if (request.status >= 200 && request.status < 300) {
        setUploadSuccess(
          `Version ${payload.version} stored as a draft${payload.triangles ? `, ${payload.triangles.toLocaleString("en-IN")} triangles` : ""}.`,
        );
        form.reset();
        setProgress(0);
        router.refresh();
        return;
      }
      setUploadError(payload.error || "The model could not be uploaded.");
    };
    request.onerror = () => {
      setUploading(false);
      setUploadError("The upload was interrupted. Check your connection and try again.");
    };
    request.send(data);
  }

  const status = model?.status ?? "not_available";
  const hasFile = Boolean(modelUrl);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={status}
          label={VENUE_MODEL_STATUS_LABELS[status]}
          tone={venueModelStatusTone(status)}
        />
        {model ? (
          <>
            <Badge tone={venueModelAccuracyTone(model.accuracy)}>
              {VENUE_MODEL_ACCURACY_LABELS[model.accuracy]}
            </Badge>
            <Badge tone="neutral">v{model.version}</Badge>
            <span className="text-[0.7rem] text-muted">{fileSize(model.fileBytes)}</span>
          </>
        ) : (
          <span className="text-[0.7rem] text-muted">
            No file uploaded. The venue page keeps its photographs.
          </span>
        )}
      </div>

      {model ? (
        <dl className="grid grid-cols-2 gap-2 text-[0.7rem] text-muted sm:grid-cols-4">
          <div>
            <dt>Uploaded</dt>
            <dd className="mt-0.5 text-foreground">{model.uploadedAt ? formatDateTime(model.uploadedAt) : "—"}</dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd className="mt-0.5 text-foreground">{model.publishedAt ? formatDateTime(model.publishedAt) : "Not published"}</dd>
          </div>
          <div>
            <dt>Last change</dt>
            <dd className="mt-0.5 text-foreground">{formatDateTime(model.updatedAt)}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd className="mt-0.5 truncate text-foreground">{venueName}</dd>
          </div>
        </dl>
      ) : null}

      {model?.rejectionReason ? (
        <FormAlert tone="warning">
          <span className="font-semibold">Rejected:</span> {model.rejectionReason}
        </FormAlert>
      ) : null}

      {hasFile ? (
        <VenueModelExperience
          venueName={venueName}
          modelUrl={modelUrl!}
          posterUrl={posterUrl}
          accuracyLabel={model ? VENUE_MODEL_ACCURACY_LABELS[model.accuracy] : "Conceptual reconstruction"}
          variant="admin"
        />
      ) : null}

      <form onSubmit={submitUpload} className="space-y-3 border-t border-border pt-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Upload or replace</p>
          <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted">
            GLB only, up to 40 MB. A new file always returns to draft, even when the
            previous version was published.
          </p>
        </div>

        {uploadError ? <FormAlert tone="error">{uploadError}</FormAlert> : null}
        {uploadSuccess ? <FormAlert tone="success">{uploadSuccess}</FormAlert> : null}

        <Field label="Model file" htmlFor="model-file" hint="Exported from Blender as glTF 2.0 binary.">
          <input
            id="model-file"
            name="file"
            type="file"
            accept=".glb,model/gltf-binary"
            required
            className="block w-full text-xs text-muted file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:border-primary/40"
          />
        </Field>

        <Field
          label="Preview image"
          htmlFor="model-preview"
          hint="Optional. Shown on the venue page before the model opens."
        >
          <input
            id="model-preview"
            name="preview"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-xs text-muted file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-border-strong file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:border-primary/40"
          />
        </Field>

        <Field label="Accuracy" htmlFor="model-accuracy" hint="Be honest. A conceptual reconstruction is not a survey.">
          <Select
            id="model-accuracy"
            name="accuracy"
            options={ACCURACY_OPTIONS}
            defaultValue={model?.accuracy ?? "conceptual"}
          />
        </Field>

        <Field label="Internal notes" htmlFor="model-notes" hint="Only visible to administrators.">
          <Textarea
            id="model-notes"
            name="notes"
            rows={3}
            maxLength={4000}
            defaultValue={model?.notes ?? ""}
            placeholder="Assumptions, source references, what still needs measuring…"
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

        <Button type="submit" size="sm" loading={uploading} disabled={uploading}>
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          {model ? "Replace model" : "Upload model"}
        </Button>
      </form>

      {model ? (
        <>
          <form action={metaAction} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">Details</p>
            <input type="hidden" name="venueId" value={venueId} />
            {metaState.error ? <FormAlert tone="error">{metaState.error}</FormAlert> : null}
            {metaState.success ? <FormAlert tone="success">{metaState.success}</FormAlert> : null}

            <Field label="Accuracy" htmlFor="model-accuracy-meta">
              <Select
                id="model-accuracy-meta"
                name="accuracy"
                options={ACCURACY_OPTIONS}
                defaultValue={model.accuracy}
              />
            </Field>
            <Field label="Internal notes" htmlFor="model-notes-meta">
              <Textarea
                id="model-notes-meta"
                name="notes"
                rows={3}
                maxLength={4000}
                defaultValue={model.notes}
              />
            </Field>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
              <Box className="h-3.5 w-3.5" aria-hidden="true" />
              Save details
            </SubmitButton>
          </form>

          <form action={statusAction} className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-semibold text-foreground">Publication</p>
            <input type="hidden" name="venueId" value={venueId} />
            {statusState.error ? <FormAlert tone="error">{statusState.error}</FormAlert> : null}
            {statusState.success ? <FormAlert tone="success">{statusState.success}</FormAlert> : null}

            <Field
              label="Rejection reason"
              htmlFor="model-reason"
              hint="Required when rejecting. Stored with the model record."
            >
              <Textarea
                id="model-reason"
                name="reason"
                rows={2}
                maxLength={500}
                placeholder="What needs fixing before this can be published…"
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              {status === "draft" ? (
                <SubmitButton name="status" value="under_review" size="sm" pendingLabel="Submitting…">
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Submit for review
                </SubmitButton>
              ) : null}

              {status === "under_review" ? (
                <>
                  <SubmitButton name="status" value="published" size="sm" pendingLabel="Publishing…">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Publish to customers
                  </SubmitButton>
                  <SubmitButton
                    name="status"
                    value="draft"
                    size="sm"
                    variant="secondary"
                    pendingLabel="Returning…"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Return to draft
                  </SubmitButton>
                </>
              ) : null}

              {status === "published" ? (
                <SubmitButton
                  name="status"
                  value="draft"
                  size="sm"
                  variant="secondary"
                  pendingLabel="Unpublishing…"
                >
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Unpublish
                </SubmitButton>
              ) : null}

              {status === "rejected" ? (
                <>
                  <SubmitButton name="status" value="draft" size="sm" pendingLabel="Moving…">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Move to draft
                  </SubmitButton>
                  <SubmitButton
                    name="status"
                    value="under_review"
                    size="sm"
                    variant="secondary"
                    pendingLabel="Resubmitting…"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    Resubmit for review
                  </SubmitButton>
                </>
              ) : null}

              {status !== "rejected" ? (
                <SubmitButton
                  name="status"
                  value="rejected"
                  size="sm"
                  variant="outline"
                  pendingLabel="Rejecting…"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Reject
                </SubmitButton>
              ) : null}
            </div>

            <p className="text-[0.68rem] leading-relaxed text-muted">
              Customers only ever receive a published model. Unpublishing takes effect
              immediately and leaves the photographs in place.
            </p>
          </form>
        </>
      ) : null}
    </div>
  );
}
