/** The exercise library — shared list of lifts to pick from. */
export interface Exercise {
  id: string;
  name: string; // "Barbell Bench Press"
  muscleGroup: string; // "chest"
  isCustom: boolean;
  createdBy?: string | null; // userId, or null for built-in
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

/** Personal record for one exercise (one doc per exercise per user). */
export interface PersonalRecord {
  exerciseId: string;
  bestWeightKg: number;
  bestReps: number;
  achievedOn: string; // YYYY-MM-DD
  workoutId: string;
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
  days: PlanDay[];
}
