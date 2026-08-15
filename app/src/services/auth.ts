/**
 * Auth service — sign up / sign in / sign out and the current user.
 * Owner: jaikanth (backend).
 *
 * Uses Firebase Auth (email + password to start; Google can be added later).
 * On sign-up we also create the user's Firestore profile document with sensible
 * defaults, so the rest of the app can assume a profile always exists.
 */
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile } from './users';

/** Create an account, set the display name, and seed the profile doc. */
export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await createUserProfile(cred.user.uid, { displayName, email });
  return cred.user.uid;
}

/** Sign in with email + password. Returns the user id. */
export async function signIn(email: string, password: string): Promise<string> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}

/** Sign the current user out. */
export function signOutUser(): Promise<void> {
  return signOut(auth);
}

/** The currently signed-in user id, or null. */
export function currentUserId(): string | null {
  return auth.currentUser?.uid ?? null;
}

/**
 * Subscribe to auth changes (signed in / out). Call the returned function to
 * unsubscribe. The UI uses this to decide between the auth screen and the app.
 */
export function onAuthChange(cb: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
