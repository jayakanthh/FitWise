/**
 * Nutrition service — daily targets & food log. (Phase 3)
 * Owner: jaikanth (backend).
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { FoodLogEntry, NutritionTargets } from '../models';
import { db } from './firebase';

const targetsRef = (userId: string) =>
  doc(db, 'users', userId, 'meta', 'nutritionTargets');

/** Set the user's daily calorie & macro targets. */
export async function setNutritionTargets(
  userId: string,
  targets: NutritionTargets,
): Promise<void> {
  await setDoc(targetsRef(userId), targets);
}

/** Read the user's targets, or null if not set yet. */
export async function getNutritionTargets(
  userId: string,
): Promise<NutritionTargets | null> {
  const snap = await getDoc(targetsRef(userId));
  return snap.exists() ? (snap.data() as NutritionTargets) : null;
}

/** Log a food entry. */
export async function logFood(
  userId: string,
  entry: Omit<FoodLogEntry, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, 'foodLog'), {
    ...entry,
    createdAt: Date.now(),
  });
  return ref.id;
}

/** All food entries for a given day (YYYY-MM-DD). */
export async function getFoodLog(userId: string, date: string): Promise<FoodLogEntry[]> {
  const q = query(collection(db, 'users', userId, 'foodLog'), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FoodLogEntry, 'id'>) }));
}

/** Delete a food entry. */
export async function deleteFood(userId: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'foodLog', entryId));
}

/** Sum a day's food into running totals — handy for the UI's progress rings. */
export function sumDay(entries: FoodLogEntry[]): NutritionTargets {
  return entries.reduce(
    (acc, e) => ({
      dailyCalories: acc.dailyCalories + e.calories,
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + e.carbsG,
      fatG: acc.fatG + e.fatG,
    }),
    { dailyCalories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
