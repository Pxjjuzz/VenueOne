/**
 * Publication rules for venue models. Pure functions only, so the rules can be
 * unit tested without a database or a storage client.
 */

import type { VenueModelStatus } from "@/lib/types";

/**
 * Allowed transitions. Publishing is reachable only from under_review, so an
 * upload that lands in draft has to pass review first.
 */
export const MODEL_STATUS_TRANSITIONS: Record<VenueModelStatus, VenueModelStatus[]> = {
  not_available: [],
  draft: ["under_review", "rejected"],
  under_review: ["published", "rejected", "draft"],
  published: ["draft", "rejected"],
  rejected: ["draft", "under_review"],
};

export function canTransition(
  from: VenueModelStatus,
  to: VenueModelStatus,
): boolean {
  return MODEL_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export type StatusChangeCheck =
  | { ok: true }
  | { ok: false; error: string };

function humanise(status: VenueModelStatus): string {
  return status.replaceAll("_", " ");
}

/**
 * Everything that can stop a status change, in one place. The service layer
 * calls this before writing; the admin UI relies on the same transitions to
 * decide which buttons to render.
 */
export function validateStatusChange(input: {
  from: VenueModelStatus;
  to: VenueModelStatus;
  hasFile: boolean;
  rejectionReason?: string | null;
}): StatusChangeCheck {
  const { from, to, hasFile, rejectionReason } = input;

  if (from === to) return { ok: true };

  if (!canTransition(from, to)) {
    return { ok: false, error: `A ${humanise(from)} model cannot move to ${humanise(to)}.` };
  }
  if (to === "published" && !hasFile) {
    return { ok: false, error: "Upload a model before publishing it." };
  }
  if (to === "rejected" && !rejectionReason?.trim()) {
    return { ok: false, error: "Add a reason when rejecting a model." };
  }
  return { ok: true };
}
