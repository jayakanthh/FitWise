/**
 * Users service — profile create / read / update.
 * Owner: jaikanth (backend).
 */
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { User, Weekday } from '../models';
import { auth, db } from './firebase';

const userRef = (userId: string) => doc(db, 'users', userId);

/** Create a new profile with sensible defaults. Called on sign-up. */
export async function createUserProfile(
  userId: string,
  data: { displayName: string; email: string },
): Promise<void> {
  const profile: User = {
    id: userId,
    displayName: data.displayName,
    email: data.email,
    createdAt: Date.now(),
    trainingDays: [], // user picks these during onboarding
    currentStreak: 0,
    longestStreak: 0,
    groupIds: [],
  };
  await setDoc(userRef(userId), profile);
}

/** Read a user's profile, or null if it doesn't exist. */
export async function getUser(userId: string): Promise<User | null> {
  const snap = await getDoc(userRef(userId));
  return snap.exists() ? (snap.data() as User) : null;
}

/** Patch profile fields (name, age, goal, height, etc.). */
export async function updateUser(
  userId: string,
  patch: Partial<Omit<User, 'id'>>,
): Promise<void> {
  await updateDoc(userRef(userId), patch);
}

/** Set which weekdays are training days (drives the streak). */
export async function setTrainingDays(userId: string, days: Weekday[]): Promise<void> {
  await updateDoc(userRef(userId), { trainingDays: days });
}

/** Stats collected during first-run onboarding. */
export interface OnboardingData {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goal?: User['goal'];
  trainingDays: Weekday[];
}

/**
 * Save onboarding answers and mark the profile onboarded. Writes a COMPLETE
 * profile (identity from Auth + streak/group defaults) via setDoc+merge, so it
 * works whether or not a profile doc already exists — anyone reaching onboarding
 * is new, so the zeroed streak/empty groups are correct.
 */
export async function completeOnboarding(
  userId: string,
  data: OnboardingData,
): Promise<void> {
  const fb = auth.currentUser;
  const profile: User = {
    id: userId,
    displayName: fb?.displayName || fb?.email?.split('@')[0] || 'Lifter',
    email: fb?.email ?? '',
    createdAt: Date.now(),
    age: data.age,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    goal: data.goal,
    trainingDays: data.trainingDays,
    currentStreak: 0,
    longestStreak: 0,
    groupIds: [],
    onboarded: true,
  };
  await setDoc(userRef(userId), profile, { merge: true });
}
