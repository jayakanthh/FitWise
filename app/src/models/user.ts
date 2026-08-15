/** A person's profile. `id` comes from Firebase Auth. */
export type Goal = 'cut' | 'maintain' | 'bulk';

export interface User {
  id: string;
  displayName: string;
  email: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  goal?: Goal;
  createdAt: number; // epoch ms
  // streak
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: string; // YYYY-MM-DD
  // which crew they belong to
  friendGroupId?: string | null;
}

/** A body measurement snapshot over time. */
export interface Measurement {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg?: number;
  bodyParts?: {
    chest?: number;
    waist?: number;
    arms?: number;
    thighs?: number;
    [part: string]: number | undefined;
  };
}

/**
 * A private health note (injury, condition, limitation).
 * ⚠️ Sensitive — must stay readable ONLY by the owning user (see backend/firestore.rules).
 */
export interface HealthNote {
  id: string;
  note: string;
  createdAt: number;
}
