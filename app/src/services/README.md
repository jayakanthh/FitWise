# services/ — jaikanth's world (backend access from the app)

This is the layer between the UI and Firebase. Screens call these functions; they never touch Firestore directly.

- `firebase.ts` — initializes Firebase (auth + Firestore). Done.
- `firebaseConfig.ts` — your project's config (gitignored; copy from `firebaseConfig.example.ts`).

Each module exposes clean async functions (e.g. `logWorkout(userId, workout)`) that return the shared types from `../models`. That's the contract Pruthvi builds UI against — he can even use mock versions until the real ones land.

### Built so far ✅
- `firebase.ts` — Firebase init (auth + Firestore).
- `dates.ts` — `YYYY-MM-DD` day helpers for streak math.
- `streaks.ts` — pure streak engine (scheduled-days model); `streakOnWorkout`, `streakIsAlive`, `effectiveCurrentStreak`. Verified against real scenarios.
- `auth.ts` — `signUp`, `signIn`, `signOutUser`, `currentUserId`, `onAuthChange`.
- `users.ts` — `createUserProfile`, `getUser`, `updateUser`, `setTrainingDays`.
- `workouts.ts` — `logWorkout` (saves + detects PRs via est-1RM + updates streak), `getWorkoutHistory`, `getPersonalRecords`.

### Still to build
- `groups.ts` — create/join a crew, read the leaderboards.
- Cloud Functions (`../../backend/functions/`) — group leaderboard updates + "someone beat your PR" push. These touch *other people's* data, so they must be server-side, not here.

### ⚠️ Before shipping: auth persistence on React Native
`firebase.ts` uses `getAuth(app)`, which does **not** persist login across app restarts on React Native (you'll see a warning). Fix when convenient:
```
npx expo install @react-native-async-storage/async-storage
```
then switch to `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })`. Fine to leave for now during early dev.
