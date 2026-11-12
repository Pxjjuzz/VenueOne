import { describe, expect, it } from "vitest";
import {
  MODEL_STATUS_TRANSITIONS,
  canTransition,
  validateStatusChange,
} from "@/lib/models/status";
import type { VenueModelStatus } from "@/lib/types";

const ALL_STATUSES = Object.keys(MODEL_STATUS_TRANSITIONS) as VenueModelStatus[];

describe("status transitions", () => {
  it("never allows a bare not_available row to move anywhere", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransition("not_available", status)).toBe(false);
    }
  });

  it("only reaches published from under_review", () => {
    const sources = ALL_STATUSES.filter((status) => canTransition(status, "published"));
    expect(sources).toEqual(["under_review"]);
  });

  it("stays in draft after an upload until someone submits it", () => {
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("draft", "under_review")).toBe(true);
  });

  it("lets a published model be withdrawn or rejected but not silently re-published", () => {
    expect(canTransition("published", "draft")).toBe(true);
    expect(canTransition("published", "rejected")).toBe(true);
    expect(canTransition("published", "published")).toBe(false);
  });

  it("brings a rejected model back through review", () => {
    expect(canTransition("rejected", "draft")).toBe(true);
    expect(canTransition("rejected", "under_review")).toBe(true);
    expect(canTransition("rejected", "published")).toBe(false);
  });

  it("treats a same-status request as a no-op", () => {
    expect(validateStatusChange({ from: "draft", to: "draft", hasFile: false })).toEqual({
      ok: true,
    });
  });
});

describe("validateStatusChange", () => {
  it("blocks publishing without a stored file", () => {
    const result = validateStatusChange({
      from: "under_review",
      to: "published",
      hasFile: false,
    });
    expect(result).toEqual({ ok: false, error: "Upload a model before publishing it." });
  });

  it("allows publishing a reviewed model that has a file", () => {
    expect(
      validateStatusChange({ from: "under_review", to: "published", hasFile: true }),
    ).toEqual({ ok: true });
  });

  it("requires a reason when rejecting", () => {
    const result = validateStatusChange({
      from: "under_review",
      to: "rejected",
      hasFile: true,
      rejectionReason: "   ",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a rejection once a reason is given", () => {
    expect(
      validateStatusChange({
        from: "under_review",
        to: "rejected",
        hasFile: true,
        rejectionReason: "Door heights look wrong.",
      }),
    ).toEqual({ ok: true });
  });

  it("explains an impossible jump in plain language", () => {
    const result = validateStatusChange({
      from: "draft",
      to: "published",
      hasFile: true,
    });
    expect(result).toEqual({
      ok: false,
      error: "A draft model cannot move to published.",
    });
  });
});
