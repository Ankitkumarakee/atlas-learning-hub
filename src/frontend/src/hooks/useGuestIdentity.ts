import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";

const STORAGE_KEY = "atlas-guest-identity";

let cached: Ed25519KeyIdentity | null = null;

/**
 * Returns a stable Ed25519 guest identity, persisted to localStorage so the
 * same principal is reused across reloads. Both `useAuth` and `useBackend`
 * import this so the principal the actor signs with matches the principal
 * reported to the UI.
 */
export function getGuestIdentity(): Ed25519KeyIdentity {
  if (cached) return cached;

  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        cached = Ed25519KeyIdentity.fromJSON(stored);
        return cached;
      } catch {
        // fall through and regenerate
      }
    }
  }

  cached = Ed25519KeyIdentity.generate();
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached.toJSON()));
    } catch {
      // ignore quota / privacy mode failures
    }
  }
  return cached;
}
