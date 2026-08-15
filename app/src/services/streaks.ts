/**
 * Streak engine — the "scheduled training days" model.
 * Owner: jaikanth (backend).
 *
 * A streak = consecutive SCHEDULED training days completed without missing one.
 * Days not in `trainingDays` are ignored: resting on an off-day never breaks it,
 * and a bonus workout on an off-day doesn't advance the counter either.
 *
 * These are PURE functions (no Firebase) so they're easy to unit-test and can be
 * reused on the client for display AND later inside a Cloud Function. `lastTrainedDate`
 * here means "the last scheduled day that counted toward the streak".
 */
import { daysStrictlyBetween, weekdayOf } from './dates';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastTrainedDate?: string; // YYYY-MM-DD of last scheduled day counted
}

/** Did a scheduled day get missed strictly between `from` and `to`? */
function missedAScheduledDay(from: string, to: string, trainingDays: number[]): boolean {
  return daysStrictlyBetween(from, to).some((d) => trainingDays.includes(weekdayOf(d)));
}

/**
 * Recompute streak when a workout is logged on `today`.
 * Only advances on scheduled days; off-day workouts leave the streak untouched.
 */
export function streakOnWorkout(
  prev: StreakState,
  trainingDays: number[],
  today: string,
): StreakState {
  const isScheduledToday = trainingDays.includes(weekdayOf(today));
  // Off-day workout, or already counted today → no streak change.
  if (!isScheduledToday || prev.lastTrainedDate === today) return prev;

  const continues =
    prev.lastTrainedDate !== undefined &&
    !missedAScheduledDay(prev.lastTrainedDate, today, trainingDays);

  const currentStreak = continues ? prev.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    lastTrainedDate: today,
  };
}

/**
 * Is the streak still alive as of `today`? False once a scheduled day has fully
 * passed untrained. `today` itself is excluded — you still have all day to train.
 * Use this for DISPLAY so a stale `currentStreak` shows as broken before the next log.
 */
export function streakIsAlive(
  lastTrainedDate: string | undefined,
  trainingDays: number[],
  today: string,
): boolean {
  if (!lastTrainedDate) return true; // nothing to break yet
  return !missedAScheduledDay(lastTrainedDate, today, trainingDays);
}

/** The streak to actually show today (resets to 0 once a scheduled day is missed). */
export function effectiveCurrentStreak(
  state: StreakState,
  trainingDays: number[],
  today: string,
): number {
  return streakIsAlive(state.lastTrainedDate, trainingDays, today) ? state.currentStreak : 0;
}
