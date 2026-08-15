# backend/ — Firebase (jaikanth)

Everything server-side for IronSync lives here. This is the backend owner's home base.

## What's in here

| File | What it is |
| --- | --- |
| `firestore.rules` | Security rules — the real access control. Health data is owner-only; only shared data is group-visible. |
| `firestore.indexes.json` | Composite indexes (empty for now; add as queries need them). |
| `firebase.json` | Firebase project config + local emulator ports. |
| `functions/` | Cloud Functions — server-side logic (e.g. the "beat your PR" notification). |

> Note: the *app's* connection to Firebase (init + data-access functions the UI calls) lives in `app/src/services/`. This folder is for rules, indexes, and server-side functions.

## First-time setup

1. Install the Firebase CLI: `npm install -g firebase-tools`
2. Create the project in the [Firebase console](https://console.firebase.google.com/) (enable Auth + Firestore).
3. From this folder: `firebase login` then `firebase use --add` to link the project.
4. Deploy rules: `firebase deploy --only firestore:rules`
5. For Cloud Functions: `firebase init functions` (generates the real functions project; use `functions/index.example.js` as the reference for the beat-your-PR logic).

## Local development

Run everything locally without touching production data:

```bash
firebase emulators:start
```

Point the app at the emulators while developing (connect `auth`/`db` in `app/src/services/firebase.ts` to the emulator hosts). Test the security rules here before deploying.
