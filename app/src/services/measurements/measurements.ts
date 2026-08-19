import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { MeasurementEntry, MeasurementGoal, MeasurementGoalStatus } from '../../models/measurement';

const M_COL = 'measurements';
const G_COL = 'goals';

export async function logMeasurement(
  userId: string,
  entry: Omit<MeasurementEntry, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, M_COL), {
    ...entry,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function getMeasurementHistory(
  userId: string,
  type: string
): Promise<MeasurementEntry[]> {
  const q = query(
    collection(db, 'users', userId, M_COL),
    where('type', '==', type)
  );
  const snap = await getDocs(q);
  const entries = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MeasurementEntry, 'id'>) }));
  return entries.sort((a, b) => a.recordedAt - b.recordedAt);
}


export async function createGoal(
  userId: string,
  goalData: Omit<MeasurementGoal, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  // Pause any active goals first
  const activeGoals = await getGoals(userId, 'active');
  for (const g of activeGoals) {
    await updateGoal(userId, g.id, { status: 'paused' });
  }

  const ref = await addDoc(collection(db, 'users', userId, G_COL), {
    ...goalData,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  // Update user's active goal reference
  await updateDoc(doc(db, 'users', userId), { targetGoalId: ref.id });
  
  return ref.id;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  updates: Partial<Omit<MeasurementGoal, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, G_COL, goalId), {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function getGoals(
  userId: string,
  status?: MeasurementGoalStatus
): Promise<MeasurementGoal[]> {
  let q = query(collection(db, 'users', userId, G_COL));
  if (status) {
    q = query(q, where('status', '==', status));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MeasurementGoal, 'id'>) }));
}

export async function getActiveGoal(userId: string): Promise<MeasurementGoal | null> {
  const goals = await getGoals(userId, 'active');
  return goals.length > 0 ? goals[0] : null;
}
