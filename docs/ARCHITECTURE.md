# FitWise — Architecture & Tech Decisions

Where we record *what* we picked and *why*, so future-us (and anyone new) understands the reasoning. Update this whenever we make a real decision.

---

## Decided

### Backend: Firebase ✅
- **Auth** — email/Google sign-in out of the box, no server to run.
- **Cloud Firestore** — our database (see [DATA_MODEL.md](DATA_MODEL.md)).
- **Cloud Messaging (FCM)** — push notifications for "someone beat your PR" and streak reminders.
- **Cloud Functions** — server-side logic (PR detection, notifications) without managing servers.

**Why:** we're a two-person team who want to ship, not run infrastructure. Firebase gives us auth + database + notifications + serverless functions in one place, with a generous free tier.

**Trade-off we accept:** some vendor lock-in to Google, and Firestore's NoSQL model takes a bit of getting used to.

---

## Still to decide

### Frontend: mobile vs web ⏳

This is the big open one. The trade-offs:

| Option | Pros | Cons |
| --- | --- | --- |
| **React Native (Expo)** | One codebase → iOS + Android; JS/TS; huge ecosystem; pairs great with Firebase | Mobile-only unless we add web separately |
| **Flutter** | Beautiful, fast UI; one codebase for iOS + Android (+ web) | Dart is a new language for us to learn |
| **Web app (React)** | Fastest to build & share (just a link); no app store; easy to test | Not a "real" installed app; push notifications on iOS web are limited |

**Gut check:** a gym app is used *at the gym, on a phone*. That leans mobile. React Native + Firebase is the most common, best-documented combo for exactly this kind of app, and TypeScript is friendlier to learn than Dart. **Leading candidate: React Native (Expo).** But if we want the absolute fastest path to something shareable, a web app wins short-term.

_Decision: pending. Write it here when we make it._

### Other open questions
- Food/nutrition data — own database vs third-party API (e.g. a nutrition API)?
- State management on the frontend — decide once stack is picked.
- Do we need offline support (logging a workout with no signal at the gym)? Firestore has offline caching, which is a point in its favor.

---

## Privacy & sensitive data

FitWise stores **health information** (injuries, conditions) and **body measurements**. This is sensitive personal data and we should treat it with care:

- **Firestore Security Rules** must ensure a user's profile, health notes, and measurements are readable/writable **only by that user**. Health data should *never* be exposed to the friend group.
- Only explicitly-shared data (PRs, supplement posts a user chooses to post) is visible to the crew.
- Add clear in-app disclaimers: **FitWise is a fitness tracker, not medical advice.** Supplement notes are personal experience, not recommendations.
- Be mindful of data-protection expectations (e.g. GDPR-style rights) if this ever goes beyond just us — let users delete their data.

We'll write and version the actual security rules (`firestore.rules`) once we start building.

---

## Decision log

Keep a running list of notable decisions here (date + what + why), newest first.

- **2026-08** — Chose Firebase as the backend. _Why:_ fastest path for a two-person team; built-in auth, DB, notifications, and serverless.
- **2026-08** — Frontend stack left open pending a build spike. _Why:_ want to weigh React Native vs web before committing.
