/**
 * Plans service — user-created training plans (public or private).
 * Owner: jaikanth (backend).
 *
 * A plan is a set of days, each day a list of exercises (from the seeded library).
 * Users build their own, follow it, and can make it public so others can use it.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { Plan, PlanDay } from '../models';
import { db } from './firebase';

const plansCol = () => collection(db, 'plans');

/** Create a new plan. Returns the new plan id. */
export async function createPlan(
  userId: string,
  data: { name: string; days: PlanDay[]; visibility: 'public' | 'private'; authorName?: string },
): Promise<string> {
  const ref = doc(plansCol());
  const plan: Plan = {
    id: ref.id,
    name: data.name,
    createdBy: userId,
    createdByName: data.authorName,
    visibility: data.visibility,
    createdAt: Date.now(),
    days: data.days,
  };
  await setDoc(ref, plan);
  return ref.id;
}

/** One plan by id. */
export async function getPlan(planId: string): Promise<Plan | null> {
  const snap = await getDoc(doc(db, 'plans', planId));
  return snap.exists() ? (snap.data() as Plan) : null;
}

/** Plans created by this user. */
export async function getMyPlans(userId: string): Promise<Plan[]> {
  const snap = await getDocs(query(plansCol(), where('createdBy', '==', userId)));
  return snap.docs.map((d) => d.data() as Plan).sort(byNewest);
}

/** Public plans anyone can browse & use (newest first). */
export async function getPublicPlans(max = 50): Promise<Plan[]> {
  const snap = await getDocs(query(plansCol(), where('visibility', '==', 'public')));
  return snap.docs
    .map((d) => d.data() as Plan)
    .sort(byNewest)
    .slice(0, max);
}

/** Update an existing plan's name, days, and visibility. */
export async function updatePlan(
  planId: string,
  data: { name: string; days: PlanDay[]; visibility: 'public' | 'private' },
): Promise<void> {
  await updateDoc(doc(db, 'plans', planId), {
    name: data.name,
    days: data.days,
    visibility: data.visibility,
  });
}

/** Flip a plan between public and private. */
export async function setPlanVisibility(
  planId: string,
  visibility: 'public' | 'private',
): Promise<void> {
  await updateDoc(doc(db, 'plans', planId), { visibility });
}

/** Copy a public plan into your own plans so you can follow/edit it. */
export async function clonePlan(userId: string, plan: Plan, authorName?: string): Promise<string> {
  return createPlan(userId, {
    name: plan.name,
    days: plan.days,
    visibility: 'private',
    authorName,
  });
}

/** Delete a plan you own. */
export async function deletePlan(planId: string): Promise<void> {
  await deleteDoc(doc(db, 'plans', planId));
}

const byNewest = (a: Plan, b: Plan) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
