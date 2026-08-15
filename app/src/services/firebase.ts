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

/** Firebase Auth instance — sign in / sign up / current user. */
export const auth = getAuth(app);

/** Cloud Firestore instance — our database (see docs/DATA_MODEL.md). */
export const db = getFirestore(app);

export default app;
