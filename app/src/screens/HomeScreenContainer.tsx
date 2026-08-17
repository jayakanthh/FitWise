import { useEffect, useState } from 'react';
import HomeScreen from './HomeScreen';
import { initialUserProfile } from '../data/mockData';
import { useCurrentUser } from '../context/CurrentUser';
import { userToProfile } from '../services/adapters';
import { getMyPlans, getPlan } from '../services';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Feeds HomeScreen the real signed-in user and — for "Today's Plan" — today's
 * day from the user's active/following plan (falling back to their newest plan),
 * matched to the current weekday.
 */
export default function HomeScreenContainer() {
  const { profile } = useCurrentUser();
  const [today, setToday] = useState<{ title: string; subtitle: string } | undefined>(undefined);

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
      buddies={[]}
      todayTitle={today?.title}
      todaySubtitle={today?.subtitle}
      onFindMatchClick={() => {}}
      onStartTodayPlan={() => {}}
      onSelectBuddyWorkout={() => {}}
    />
  );
}
