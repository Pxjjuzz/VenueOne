import { describe, expect, it } from "vitest";
import { createBookingReference, createIdempotencyKey } from "@/lib/reference";

describe("booking references", () => {
  it("uses the CG prefix and avoids ambiguous characters", () => {
    for (let index = 0; index < 200; index += 1) {
      const reference = createBookingReference();
      expect(reference).toMatch(/^CG-[A-HJ-NP-Z2-9]{6}$/);
      expect(reference).not.toMatch(/[IO01]/);
    }
  });
});

describe("idempotency keys", () => {
  it("creates 128-bit hex keys", () => {
    const key = createIdempotencyKey();
    expect(key).toMatch(/^[a-f0-9]{32}$/);
  });

  it("does not repeat keys", () => {
    const keys = new Set(Array.from({ length: 500 }, () => createIdempotencyKey()));
    expect(keys.size).toBe(500);
  });
});
