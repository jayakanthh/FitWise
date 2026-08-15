# IronSync — App (Expo / React Native + TypeScript)

The mobile app. One codebase runs on iOS + Android via [Expo](https://expo.dev/).

## Run it

```bash
cd app
npm install
npm start
```

Then scan the QR code with the **Expo Go** app on your phone, or press `i` (iOS simulator) / `a` (Android emulator) / `w` (web).

> The app runs out of the box (shows the Home screen). Firebase features need the config step below.

## Connect Firebase (backend)

```bash
cp src/services/firebaseConfig.example.ts src/services/firebaseConfig.ts
```

Then paste your project's values into `firebaseConfig.ts` (from the Firebase console). This file is gitignored — each dev supplies their own.

## Structure

```
app/
├── App.tsx                 ← entry point (renders the current screen)
├── src/
│   ├── screens/            ← full screens        (Pruthvi / UI)
│   ├── components/         ← reusable UI pieces   (Pruthvi / UI)
│   ├── theme/              ← colors & spacing     (Pruthvi / UI)
│   ├── models/             ← shared data types    (the contract — both)
│   └── services/           ← Firebase & data access (jaikanth / backend)
└── ...
```

## Who owns what
- **Pruthvi (UI):** `screens/`, `components/`, `theme/`
- **jaikanth (backend):** `services/`, plus `../backend/` (Firestore rules & Cloud Functions)
- **Shared contract:** `models/` — change data shapes here first.

See the repo root [docs/](../docs/) for features, roadmap, and the data model.
