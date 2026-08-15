# FitWise — Data Model (Firebase sketch)

A first draft of how FitWise's data is organized. This assumes **Firebase** (Cloud Firestore). It's a sketch to think with, **not** final — we'll refine as we build. If we end up on Supabase/SQL instead, the same entities map to tables.

Firestore is a NoSQL document database: **collections** contain **documents**, and documents can hold sub-collections.

---

## Core entities

### `users/{userId}`
The person's profile. `userId` comes from Firebase Auth.

```
users/{userId}
  displayName: string
  email: string
  age: number
  gender: string
  heightCm: number
  goal: "cut" | "maintain" | "bulk"
  createdAt: timestamp
  currentStreak: number
  longestStreak: number
  lastWorkoutDate: date
  friendGroupId: string | null     // which crew they belong to
```

Sub-collections under a user:

```
users/{userId}/measurements/{measurementId}
  date: date
  weightKg: number
  bodyParts: { chest, waist, arms, thighs, ... }   // optional map

users/{userId}/healthNotes/{noteId}
  note: string          // e.g. "left knee injury – avoid deep squats"
  createdAt: timestamp
```

> 🔒 Health notes & measurements are sensitive — Firestore Security Rules must restrict them to the owner only. See [ARCHITECTURE.md](ARCHITECTURE.md#privacy--sensitive-data).

### `exercises/{exerciseId}`
Shared exercise library (readable by everyone, edited by us).

```
exercises/{exerciseId}
  name: string          // "Barbell Bench Press"
  muscleGroup: string   // "chest"
  isCustom: boolean
  createdBy: userId | null
```

### `users/{userId}/workouts/{workoutId}`
A single workout session.

```
users/{userId}/workouts/{workoutId}
  date: date
  planId: string | null       // if it came from a training plan
  entries: [
    { exerciseId, sets: [ { reps, weightKg } ] },
    ...
  ]
  notes: string
  createdAt: timestamp
```

### `users/{userId}/prs/{exerciseId}`
Personal record per exercise (one doc per exercise = easy lookups).

```
users/{userId}/prs/{exerciseId}
  exerciseId: string
  bestWeightKg: number
  bestReps: number
  achievedOn: date
  workoutId: string           // which session set it
```

### `plans/{planId}`
A training plan/template (e.g. Push/Pull/Legs).

```
plans/{planId}
  name: string
  createdBy: userId | null     // null = built-in plan
  days: [
    { label: "Push", exercises: [ { exerciseId, targetSets, targetReps } ] },
    ...
  ]
```

---

## Social / friend group

### `groups/{groupId}`
A private crew.

```
groups/{groupId}
  name: string
  members: [ userId, ... ]
  createdBy: userId
  createdAt: timestamp
```

### `groups/{groupId}/leaderboard/{exerciseId}`
Denormalized view so the crew's PR board loads fast. Updated when a member sets a PR.

```
groups/{groupId}/leaderboard/{exerciseId}
  exerciseId: string
  topEntries: [ { userId, displayName, weightKg, reps, date }, ... ]
```

### `groups/{groupId}/streakBoard` (single doc)
Denormalized ranking of every member's current streak, so the group streak leaderboard loads in one read. Updated whenever a member's streak changes (e.g. from the same Cloud Function that updates `currentStreak` on the user).

```
groups/{groupId}/streakBoard
  updatedAt: timestamp
  entries: [
    { userId, displayName, currentStreak, longestStreak },
    ...
  ]                            // sort by currentStreak to rank
```

> Each member's `currentStreak` / `longestStreak` already live on `users/{userId}` — this doc just caches the group's copies together so we don't read every member's profile to draw the board.

### `groups/{groupId}/supplementPosts/{postId}`
Supplement result sharing.

```
groups/{groupId}/supplementPosts/{postId}
  authorId: userId
  supplementName: string       // "Creatine Monohydrate"
  note: string                 // "week 4, strength clearly up"
  rating: number               // optional 1–5
  createdAt: timestamp
```

---

## Nutrition (Phase 3)

```
users/{userId}/nutritionTargets (single doc)
  dailyCalories: number
  proteinG: number
  carbsG: number
  fatG: number

users/{userId}/foodLog/{entryId}
  date: date
  name: string
  calories: number
  proteinG, carbsG, fatG: number
  createdAt: timestamp
```

---

## Notifications: "someone beat your PR"

The tricky bit worth thinking about early. Rough flow:

1. A member logs a workout that sets a new PR on, say, Bench Press.
2. A **Cloud Function** (server-side, triggered on the new PR) checks the group leaderboard for that exercise.
3. If this new PR beats the previous holder's number, it sends that person a **push notification** ("🔥 Alex just beat your Bench Press PR!") and updates the leaderboard.

Doing this in a Cloud Function (not the client) keeps it reliable and secure. This is why we may add a `functions/` folder later.

---

## Notes & open questions

- **Denormalization:** Firestore rewards duplicating a bit of data (e.g. `displayName` on leaderboard entries) to avoid extra reads. We'll balance this as we go.
- Do PRs belong per-user only, or also cached on the group for speed? (Sketch above does both.)
- How do we define "beat a PR" — heavier weight? more reps at same weight? estimated 1-rep-max? Worth deciding before Phase 2.
