/**
 * Firebase initialization — the app's connection to the backend.
 * Owner: jaikanth (backend).
 *
 * The real config values are NOT committed. Copy `firebaseConfig.example.ts`
 * to `firebaseConfig.ts`, paste the values from the Firebase console, and
 * you're connected. `firebaseConfig.ts` is gitignored.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

const app = initializeApp(firebaseConfig);

/**
 * Firebase Auth instance.
 * TODO(persistence): on native this doesn't survive a full app restart. Firebase
 * v12 changed the RN persistence API (getReactNativePersistence was removed);
 * revisit with the v12-recommended approach so logins stick across restarts.
 */
export const auth = getAuth(app);

/** Cloud Firestore instance — our database (see docs/DATA_MODEL.md). */
export const db = getFirestore(app);

export default app;
