/**
 * Profile service — body measurements & health notes.
 * Owner: jaikanth (backend).
 *
 * 🔒 This is the SENSITIVE stuff. It lives under users/{uid}/… and the security
 * rules make it owner-only — it must NEVER be visible to the crew. Handle with care.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import type { HealthNote, Measurement } from '../models';
import { db } from './firebase';

// ---- Body measurements ------------------------------------------------------

/** Record a measurement snapshot (weight and/or body parts). */
export async function addMeasurement(
  userId: string,
  m: Omit<Measurement, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, 'measurements'), m);
  return ref.id;
}

/** All measurements, newest first (for charts & history). */
export async function getMeasurements(userId: string): Promise<Measurement[]> {
  const q = query(collection(db, 'users', userId, 'measurements'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Measurement, 'id'>) }));
}

// ---- Health notes -----------------------------------------------------------

/** Add a private health note (injury, condition, limitation). */
export async function addHealthNote(userId: string, note: string): Promise<string> {
  const ref = await addDoc(collection(db, 'users', userId, 'healthNotes'), {
    note,
    createdAt: Date.now(),
  });
  return ref.id;
}

/** Read the user's health notes, newest first. */
export async function getHealthNotes(userId: string): Promise<HealthNote[]> {
  const q = query(
    collection(db, 'users', userId, 'healthNotes'),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HealthNote, 'id'>) }));
}

/** Delete a health note. */
export async function deleteHealthNote(userId: string, noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'healthNotes', noteId));
}
