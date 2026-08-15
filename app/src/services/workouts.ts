/**
 * Workouts service — log a workout, read history, and the side effects that
 * a workout triggers: personal-record detection and the streak update.
 * Owner: jaikanth (backend).
 *
 * SCOPE NOTE (client vs server):
 *  - Updating YOUR OWN streak and YOUR OWN PR docs happens here, client-side.
 *    That's fine — it's your own data and the security rules already allow it.
 *  - Updating GROUP leaderboards and sending "someone beat your PR" push
 *    notifications will live in a Cloud Function (Phase 2), because that touches
 *    other people's data and must be trusted/server-side. See backend/functions/.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { estimate1RM, type PersonalRecord, type Workout } from '../models';
import { todayISO } from './dates';
import { db } from './firebase';
import { streakOnWorkout, type StreakState } from './streaks';
import { getUser } from './users';

/** What logging a workout produced — handy for the UI to celebrate. */
export interface LogWorkoutResult {
  workoutId: string;
  newPRs: PersonalRecord[]; // exercises where this session set a new PR
  streak: StreakState;
}

/**
 * Log a workout, then update PRs and the streak.
 * `date` defaults to today; pass it to back-fill a past session.
 */
export async function logWorkout(
  userId: string,
  workout: Omit<Workout, 'id' | 'createdAt'>,
): Promise<LogWorkoutResult> {
  const date = workout.date || todayISO();

  // 1. Save the workout.
  const ref = await addDoc(collection(db, 'users', userId, 'workouts'), {
    ...workout,
    date,
    createdAt: Date.now(),
  });

  // 2. Detect & save new PRs.
  const newPRs = await updatePRsFromWorkout(userId, ref.id, date, workout.entries);

  // 3. Update the streak.
  const user = await getUser(userId);
  const prevState: StreakState = {
    currentStreak: user?.currentStreak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    lastTrainedDate: user?.lastTrainedDate,
  };
  const streak = streakOnWorkout(prevState, user?.trainingDays ?? [], date);
  if (streak !== prevState) {
    await updateDoc(doc(db, 'users', userId), {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastTrainedDate: streak.lastTrainedDate,
    });
  }

  return { workoutId: ref.id, newPRs, streak };
}

/** For each exercise in the workout, save a PR if this session beat the stored one. */
async function updatePRsFromWorkout(
  userId: string,
  workoutId: string,
  date: string,
  entries: Workout['entries'],
): Promise<PersonalRecord[]> {
  // Best estimated-1RM set per exercise in this workout.
  const bestByExercise = new Map<string, { e1rm: number; weightKg: number; reps: number }>();
  for (const entry of entries) {
    for (const set of entry.sets) {
      const e1rm = estimate1RM(set.weightKg, set.reps);
      const cur = bestByExercise.get(entry.exerciseId);
      if (!cur || e1rm > cur.e1rm) {
        bestByExercise.set(entry.exerciseId, { e1rm, weightKg: set.weightKg, reps: set.reps });
      }
    }
  }

  const beaten: PersonalRecord[] = [];
  for (const [exerciseId, best] of bestByExercise) {
    const prRef = doc(db, 'users', userId, 'prs', exerciseId);
    const existing = await getDoc(prRef);
    const prevBest = existing.exists() ? (existing.data() as PersonalRecord).estimated1RM : 0;
    if (best.e1rm > prevBest) {
      const pr: PersonalRecord = {
        exerciseId,
        estimated1RM: best.e1rm,
        bestWeightKg: best.weightKg,
        bestReps: best.reps,
        achievedOn: date,
        workoutId,
      };
      await setDoc(prRef, pr);
      beaten.push(pr);
    }
  }
  return beaten;
}

/** Recent workouts, newest first. */
export async function getWorkoutHistory(userId: string, max = 30): Promise<Workout[]> {
  const q = query(
    collection(db, 'users', userId, 'workouts'),
    orderBy('date', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Workout, 'id'>) }));
}

/** All of a user's current PRs. */
export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'prs'));
  return snap.docs.map((d) => d.data() as PersonalRecord);
}
