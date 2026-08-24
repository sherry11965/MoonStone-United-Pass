//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Caller-generated idempotency key for a single mutation intent
//

/**
 * Generates a caller-side idempotency key for one mutation intent
 * (`docs/api-contracts.md`: `[A-Za-z0-9_-]{32,128}`). Same shape as the
 * legacy DreamUP admin command layer: 32 random bytes rendered as 64 hex
 * characters, regenerated per attempt so retries never collide while one
 * user intent maps to exactly one key.
 */
export function createIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
