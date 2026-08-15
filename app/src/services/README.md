# services/ — jaikanth's world (backend access from the app)

This is the layer between the UI and Firebase. Screens call these functions; they never touch Firestore directly.

- `firebase.ts` — initializes Firebase (auth + Firestore). Done.
- `firebaseConfig.ts` — your project's config (gitignored; copy from `firebaseConfig.example.ts`).

Each module exposes clean async functions (e.g. `logWorkout(userId, workout)`) that return the shared types from `../models`. That's the contract Pruthvi builds UI against — he can even use mock versions until the real ones land.

### Built so far ✅
Import anything from the barrel: `import { logWorkout, getStreakBoard } from '../services';`
- `firebase.ts` — Firebase init (auth + Firestore).
- `dates.ts` — `YYYY-MM-DD` day helpers for streak math.
- `streaks.ts` — pure streak engine (scheduled-days model). Verified against real scenarios.
- `auth.ts` — `signUp`, `signIn`, `signOutUser`, `currentUserId`, `onAuthChange`.
- `users.ts` — `createUserProfile`, `getUser`, `updateUser`, `setTrainingDays`.
- `profile.ts` — 🔒 `addMeasurement`, `getMeasurements`, `addHealthNote`, `getHealthNotes`, `deleteHealthNote`.
- `workouts.ts` — `logWorkout` (saves + detects est-1RM PRs + updates streak + syncs crew boards), `getWorkoutHistory`, `getPersonalRecords`.
- `exercises.ts` — `getExercises`, `getExercisesByMuscle`, `getExercise`, `addCustomExercise`.
- `groups.ts` — `createGroup`, `joinGroup`, `leaveGroup`, `getMyGroups`, `getLeaderboard`, `getStreakBoard`, `postSupplement`, `getSupplementPosts`, plus the board-sync helpers.
- `nutrition.ts` — `setNutritionTargets`, `getNutritionTargets`, `logFood`, `getFoodLog`, `sumDay`.

### Client-side vs Cloud Functions (Spark plan reality)
We're on the free **Spark** plan, which can't run Cloud Functions. So crew-board updates (streak board + PR leaderboards) currently run **client-side** inside transactions (`groups.ts`). That works for small crews.

The production version lives in `../../backend/functions/` and needs the **Blaze** plan. It owns the boards authoritatively and sends the "someone beat your PR" **push** (which genuinely needs a server). When you enable Blaze and deploy it, **remove the client-side board-sync calls** in `workouts.ts` so boards aren't written twice.

### ⚠️ Before shipping: auth persistence on React Native
`firebase.ts` uses `getAuth(app)`, which does **not** persist login across app restarts on React Native (you'll see a warning). Fix when convenient:
```
npx expo install @react-native-async-storage/async-storage
```
then switch to `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`. Fine to leave for now during early dev.
