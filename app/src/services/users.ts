/**
 * Users service — profile create / read / update.
 * Owner: jaikanth (backend).
 */
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { User, Weekday } from '../models';
import { db } from './firebase';

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
