# services/ — jaikanth's world (backend access from the app)

This is the layer between the UI and Firebase. Screens call these functions; they never touch Firestore directly.

- `firebase.ts` — initializes Firebase (auth + Firestore). Done.
- `firebaseConfig.ts` — your project's config (gitignored; copy from `firebaseConfig.example.ts`).

**Add data-access modules here as you build them**, e.g.:
- `auth.ts` — sign up / sign in / sign out / current user
- `workouts.ts` — create a workout, list history, detect PRs
- `streaks.ts` — update a user's streak on workout log
- `groups.ts` — create/join a group, read leaderboards

Each module exposes clean async functions (e.g. `logWorkout(userId, workout)`) that return the shared types from `../models`. That's the contract Pruthvi builds UI against — he can even use mock versions until the real ones land.

Heavier server-side logic (the "someone beat your PR" notification, streak recompute) lives in Cloud Functions under `../../backend/functions/`, not here.
