import HomeScreen from './HomeScreen';
import { initialUserProfile, initialBuddies } from '../data/mockData';
import type { TrainingBuddy } from '../types/ironsync';

/**
 * TEMP wiring: feeds HomeScreen mock data + no-op handlers so the tab renders.
 * Replace with real state (Firestore) and navigation actions (find match flow,
 * start workout flow, buddy detail) as those screens get ported.
 */
export default function HomeScreenContainer() {
  return (
    <HomeScreen
      user={initialUserProfile}
      buddies={initialBuddies}
      onFindMatchClick={() => {}}
      onStartTodayPlan={() => {}}
      onSelectBuddyWorkout={(_buddy: TrainingBuddy) => {}}
    />
  );
}
