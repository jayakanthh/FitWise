/**
 * Adapters — bridge the BACKEND domain types (src/models) to the UI view-models
 * (src/types/ironsync). This is the reconciliation seam: models/ stays the single
 * source of truth for persisted data; the UI keeps its richer view-models; these
 * functions map one to the other. UI-only fields (steps, avatar, goal pacing…)
 * that the backend doesn't track yet fall back to the provided defaults.
 * Owner: jaikanth (backend) + Pruthvi (UI) — shared contract.
 */
import type { User } from '../models';
import type { UserProfile } from '../types/ironsync';

/** Map a backend User onto the UI's UserProfile view-model. */
export function userToProfile(u: User, defaults: UserProfile): UserProfile {
  return {
    ...defaults, // cosmetic/UI-only fields the backend doesn't track yet
    id: u.id,
    name: u.displayName,
    email: u.email,
  };
}
