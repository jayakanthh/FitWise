import { useEffect, useState } from 'react';
import HomeScreen from './HomeScreen';
import { initialUserProfile, initialBuddies } from '../data/mockData';
import { useCurrentUser } from '../context/CurrentUser';
import { userToProfile } from '../services/adapters';
import { getMyPlans, getPlan, getStreakBoard } from '../services';
import type { TrainingBuddy } from '../types/ironsync';

const AVATARS = initialBuddies.map((b) => b.avatar);
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Feeds HomeScreen the real signed-in user, the real crew in "Training Now",
 * and — for "Today's Plan" — today's day from the user's active/following plan
 * (falling back to their newest plan), matched to the current weekday.
 */
export default function HomeScreenContainer() {
  const { profile } = useCurrentUser();
  const [buddies, setBuddies] = useState<TrainingBuddy[]>([]);
  const [today, setToday] = useState<{ title: string; subtitle: string } | undefined>(undefined);

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

  // Today's plan: the active plan (or newest), matched to today's weekday.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!profile) return;
      let plan = profile.activePlanId ? await getPlan(profile.activePlanId) : null;
      if (!plan) plan = (await getMyPlans(profile.id))[0] ?? null;
      if (!alive) return;
      if (!plan) {
        setToday({ title: 'No plan yet', subtitle: 'Create one in Workouts →' });
        return;
      }
      const todayLabel = DAY_LABELS[new Date().getDay()];
      const day = plan.days.find((d) => d.label === todayLabel);
      setToday(
        day
          ? { title: `${plan.name} · ${todayLabel}`, subtitle: `${day.exercises.length} exercises` }
          : { title: 'Rest day 😌', subtitle: plan.name },
      );
    })();
    return () => {
      alive = false;
    };
  }, [profile?.activePlanId, profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const user = profile ? userToProfile(profile, initialUserProfile) : initialUserProfile;

  return (
    <HomeScreen
      user={user}
      buddies={buddies}
      todayTitle={today?.title}
      todaySubtitle={today?.subtitle}
      onFindMatchClick={() => {}}
      onStartTodayPlan={() => {}}
      onSelectBuddyWorkout={() => {}}
    />
  );
}
