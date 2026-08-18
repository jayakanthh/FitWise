/**
 * Adapters — bridge the BACKEND domain types (src/models) to the UI view-models
 * (src/types/ironsync). This is the reconciliation seam: models/ stays the single
 * source of truth for persisted data; the UI keeps its richer view-models; these
 * functions map one to the other. UI-only fields (steps, avatar, goal pacing…)
 * that the backend doesn't track yet fall back to the provided defaults.
 * Owner: jaikanth (backend) + Pruthvi (UI) — shared contract.
 */
import type { Exercise as DomainExercise, Plan, User } from '../models';
import type {
  Exercise as UIExercise,
  EquipmentType,
  MuscleGroup,
  Routine as UIRoutine,
  UserProfile,
} from '../types/ironsync';

/** Map a backend User onto the UI's UserProfile view-model. */
export function userToProfile(u: User, defaults: UserProfile): UserProfile {
  return {
    ...defaults, // cosmetic/UI-only fields the backend doesn't track yet
    id: u.id,
    name: u.displayName,
    email: u.email,
  };
}

// free-exercise-db muscle names → the UI's muscle-group filter buckets.
const MUSCLE_MAP: Record<string, MuscleGroup> = {
  chest: 'Chest',
  lats: 'Back',
  'middle back': 'Back',
  'lower back': 'Back',
  traps: 'Back',
  neck: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  forearms: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  abductors: 'Legs',
  adductors: 'Legs',
  abdominals: 'Core',
};
const EQUIP_MAP: Record<string, EquipmentType> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
};

/** Map a backend Plan onto the UI's Routine view-model (for the routine list). */
export function planToRoutine(p: Plan, isSaved = false): UIRoutine {
  return {
    id: p.id,
    name: p.name,
    creator: p.createdByName ?? 'You',
    daysPerWeek: p.days.length,
    saves: p.savedCount ?? 0,
    isSaved,
    isPublic: p.visibility === 'public',
    category: 'Strength',
    exercises: [],
  };
}

/** Map a backend Exercise onto the UI's richer Exercise view-model. */
export function exerciseToView(ex: DomainExercise): UIExercise {
  return {
    id: ex.id,
    name: ex.name,
    muscleGroup: MUSCLE_MAP[ex.muscleGroup?.toLowerCase()] ?? 'Core',
    subMuscle: ex.muscleGroup,
    equipment: EQUIP_MAP[(ex.equipment ?? '').toLowerCase()] ?? ('Body' as EquipmentType),
    image: ex.images?.[0] ?? ex.gifUrl ?? '',
    defaultSets: 3,
    defaultReps: '8-12',
    description: ex.instructions?.join(' '),
    tips: ex.instructions,
  };
}
