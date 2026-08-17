/**
 * Friends — 1-to-1 relationships (distinct from crews, which are groups).
 * A friendship is a top-level doc keyed by the sorted pair of user ids, so
 * either friend can read/write it (rule-friendly, like groups).
 */
export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  createdAt: number;
}

export interface Friendship {
  id: string; // sorted "uidA_uidB"
  members: string[]; // [uidA, uidB]
  names: Record<string, string>; // uid -> displayName
  since: number;
}
