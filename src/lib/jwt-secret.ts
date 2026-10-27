// ==============================================================
// Shared JWT secret (used by lib/auth.ts and proxy.ts)
// ==============================================================

const DEV_FALLBACK_SECRET = "maya-dev-only-jwt-secret-do-not-use-in-production";
const MIN_SECRET_LENGTH = 32;

let cachedSecret: Uint8Array | null = null;

/**
 * Returns the JWT signing key.
 * In production JWT_SECRET is required; a missing or short secret throws
 * instead of silently falling back to a key that is public in the source.
 * Resolved lazily so `next build` does not need the secret.
 */
export function getJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;

  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production.`
      );
    }
  }

  cachedSecret = new TextEncoder().encode(secret || DEV_FALLBACK_SECRET);
  return cachedSecret;
}
