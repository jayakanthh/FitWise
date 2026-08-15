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
5. Cloud Functions are already written in `functions/` (TypeScript). **They need the Blaze plan** — they won't deploy on Spark. To deploy once you're on Blaze:
   ```bash
   cd functions && npm install && npm run deploy
   ```
   Until then, the app keeps the crew boards updated client-side (see `app/src/services/groups.ts`). When you deploy the function, remove the client-side board-sync calls so boards aren't written twice.

> **Spark vs Blaze:** everything except Cloud Functions runs on the free Spark plan. The only things that need Blaze are the server-side board authority and the "beat your PR" **push notification** in `functions/`.

## Local development

Run everything locally without touching production data:

```bash
firebase emulators:start
```

Point the app at the emulators while developing (connect `auth`/`db` in `app/src/services/firebase.ts` to the emulator hosts). Test the security rules here before deploying.
