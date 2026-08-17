/** The exercise library — shared list of lifts to pick from. */
export interface Exercise {
  id: string;
  name: string; // "Barbell Bench Press"
  muscleGroup: string; // primary muscle, e.g. "chest"
  secondaryMuscles?: string[];
  equipment?: string | null; // "barbell"
  category?: string | null; // "strength", "cardio", …
  level?: string | null; // "beginner" | "intermediate" | "expert"
  force?: string | null; // "push" | "pull" | "static"
  mechanic?: string | null; // "compound" | "isolation"
  instructions?: string[];
  images?: string[]; // demo image URLs (from free-exercise-db)
  gifUrl?: string | null; // library thumbnail (first image)
  isCustom: boolean;
  createdBy?: string | null; // userId, or null for built-in / seeded
}

/** One set within an exercise entry. */
export interface WorkoutSet {
  reps: number;
  weightKg: number;
}

/** One exercise done in a workout, with its sets. */
export interface WorkoutEntry {
  exerciseId: string;
  sets: WorkoutSet[];
}

/** A single workout session. */
export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  planId?: string | null;
  entries: WorkoutEntry[];
  notes?: string;
  createdAt: number;
}

/** Personal record for one exercise (one doc per exercise per user). Ranked by estimated1RM. */
export interface PersonalRecord {
  exerciseId: string;
  estimated1RM: number; // Epley — the value we compare & rank on
  bestWeightKg: number; // the actual set that produced it
  bestReps: number;
  achievedOn: string; // YYYY-MM-DD
  workoutId: string;
}

/**
 * Estimated 1-rep-max via the Epley formula: 1RM ≈ weight × (1 + reps/30).
 * A single rep returns the weight itself. This is how IronSync decides
 * "who's stronger" and whether a PR was beaten — see docs/DATA_MODEL.md.
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10; // 1 decimal
}

/** A training plan / template (e.g. Push/Pull/Legs). */
export interface PlanDay {
  label: string; // "Push"
  exercises: { exerciseId: string; targetSets: number; targetReps: number }[];
}

export interface Plan {
  id: string;
  name: string;
  createdBy?: string | null; // null = built-in
  createdByName?: string; // denormalized author name, for public browsing
  visibility: 'public' | 'private'; // public = other users can find & use it
  createdAt?: number;
  days: PlanDay[];
}
