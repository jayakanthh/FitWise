/**
 * Exercises service — the shared exercise library.
 * Owner: jaikanth (backend).
 *
 * The library is seeded (from ExerciseDB / free-exercise-db) into the top-level
 * `exercises` collection — see backend/ for the seed script. Everyone reads it;
 * users can also add their own custom exercises.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { Exercise } from '../models';
import { db } from './firebase';

/** All exercises in the library, alphabetical. */
export async function getExercises(): Promise<Exercise[]> {
  const q = query(collection(db, 'exercises'), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Exercise, 'id'>) }));
}

/** Exercises for a given muscle group (e.g. "chest"). */
export async function getExercisesByMuscle(muscleGroup: string): Promise<Exercise[]> {
  const q = query(
    collection(db, 'exercises'),
    where('muscleGroup', '==', muscleGroup),
    orderBy('name'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Exercise, 'id'>) }));
}

/** One exercise by id. */
export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  const snap = await getDoc(doc(db, 'exercises', exerciseId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Exercise, 'id'>) }) : null;
}

/** Add a user's custom exercise to the library. */
export async function addCustomExercise(
  userId: string,
  data: { name: string; muscleGroup: string; equipment?: string },
): Promise<string> {
  const ref = doc(collection(db, 'exercises'));
  const exercise: Exercise = {
    id: ref.id,
    name: data.name,
    muscleGroup: data.muscleGroup,
    equipment: data.equipment,
    isCustom: true,
    createdBy: userId,
  };
  await setDoc(ref, exercise);
  return ref.id;
}
