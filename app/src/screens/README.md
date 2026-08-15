# screens/ — Pruthvi's world (UI)

Each screen of the app is a file here (`HomeScreen.tsx`, `LogWorkoutScreen.tsx`, `ProfileScreen.tsx`, ...).

**Guidelines**
- Pull colors/spacing from `../theme/colors.ts` — don't hardcode hex values.
- Use the shared types from `../models` so your UI matches the real data shape.
- Don't talk to Firebase directly from a screen — call functions from `../services` (jaikanth builds those). This keeps UI and backend cleanly separated.

`HomeScreen.tsx` is a placeholder to prove the app runs — replace/expand it freely.
