import { useEffect, useState } from 'react';
import HomeScreen from './HomeScreen';
import { initialUserProfile, initialBuddies } from '../data/mockData';
import { useCurrentUser } from '../context/CurrentUser';
import { userToProfile } from '../services/adapters';
import { getStreakBoard } from '../services';
import type { TrainingBuddy } from '../types/ironsync';

// Cosmetic avatar placeholders (real users have no photo yet) — cycled by index.
const AVATARS = initialBuddies.map((b) => b.avatar);

/**
 * Feeds HomeScreen the REAL signed-in user (via adapter) and, if they're in a
 * crew, their REAL crew-mates + streaks in the "Training Now" list (from the
 * group streak board) instead of the mock buddies.
 *
 * Still mock: steps / calories / today's plan — those need features (health
 * integration, plan engine) we haven't built. Owner: Pruthvi (UI) to restyle.
 */
export default function HomeScreenContainer() {
  const { profile } = useCurrentUser();
  const [buddies, setBuddies] = useState<TrainingBuddy[]>([]);

  const groupKey = (profile?.groupIds ?? []).join(',');
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!profile || profile.groupIds.length === 0) {
        setBuddies([]);
        return;
      }
      const board = await getStreakBoard(profile.groupIds[0]);
      if (!alive) return;
      setBuddies(
        board
          .filter((e) => e.userId !== profile.id)
          .map((e, i) => ({
            id: e.userId,
            name: e.displayName,
            avatar: AVATARS[i % AVATARS.length],
            activityTitle: `${e.currentStreak}-day streak`,
            streakDays: e.currentStreak,
            status: 'active' as const,
          })),
      );
    })();
    return () => {
      alive = false;
    };
  }, [groupKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const user = profile ? userToProfile(profile, initialUserProfile) : initialUserProfile;

  return (
    <HomeScreen
      user={user}
      buddies={buddies}
      onFindMatchClick={() => {}}
      onStartTodayPlan={() => {}}
      onSelectBuddyWorkout={() => {}}
    />
  );
}
