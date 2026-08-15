import HomeScreen from './HomeScreen';
import { initialUserProfile, initialBuddies } from '../data/mockData';
import { useCurrentUser } from '../context/CurrentUser';
import { userToProfile } from '../services/adapters';
import type { TrainingBuddy } from '../types/ironsync';

/**
 * Feeds HomeScreen the REAL signed-in user (name/email from Firestore) via the
 * adapter, keeping mock values for UI-only fields the backend doesn't track yet
 * (steps, calories, weight goal). Buddies are still mock until that backend lands.
 */
export default function HomeScreenContainer() {
  const { profile } = useCurrentUser();
  const user = profile ? userToProfile(profile, initialUserProfile) : initialUserProfile;

  return (
    <HomeScreen
      user={user}
      buddies={initialBuddies}
      onFindMatchClick={() => {}}
      onStartTodayPlan={() => {}}
      onSelectBuddyWorkout={(_buddy: TrainingBuddy) => {}}
    />
  );
}
