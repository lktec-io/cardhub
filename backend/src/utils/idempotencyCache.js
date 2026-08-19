/**
 * Deliberately simple, in-memory, short-lived cache — not a queue, not a
 * database table. Protects the public Try Our Service endpoint against
 * the ordinary case idempotency keys exist for: a browser/network-level
 * retry replaying the exact same request the client already sent (double
 * click is already prevented at the UI layer by disabling the submit
 * button while a request is in flight). A restart clears it, and that's
 * fine — the tradeoff is intentional: this needn't survive a process
 * restart to do its job, and a real queue/DB table would be
 * unnecessarily complicated for what's genuinely a short request-scoped
 * safeguard, not a durability guarantee.
 */
const cache = new Map(); // key -> { result, expiresAt }
const TTL_MS = 5 * 60 * 1000;

export function getCachedResult(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.result;
}

export function setCachedResult(key, result) {
  cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
}
