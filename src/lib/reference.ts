import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createBookingReference(): string {
  const bytes = randomBytes(6);
  let value = "";
  for (const byte of bytes) {
    value += ALPHABET[byte % ALPHABET.length];
  }
  return `CG-${value}`;
}

export function createIdempotencyKey(): string {
  return randomBytes(16).toString("hex");
}
