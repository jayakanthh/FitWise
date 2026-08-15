/**
 * Groups service — the friend crew: create/join, read the leaderboards, and
 * keep the denormalized boards in sync when a member trains.
 * Owner: jaikanth (backend).
 *
 * NOTE ON PLAN: on the free (Spark) plan we can't run Cloud Functions, so the
 * board updates here run client-side inside a transaction. That's fine for small
 * crews. When we move to Blaze, the authoritative version lives in
 * backend/functions/ (PR-beat push notifications especially need a server).
 */
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type {
  Group,
  GroupStreakBoard,
  LeaderboardEntry,
  PersonalRecord,
  StreakBoardEntry,
  SupplementPost,
} from '../models';
import { db } from './firebase';

const LEADERBOARD_SIZE = 10;

/** Short human-friendly invite code (no ambiguous chars). */
function makeInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

// ---- Crew lifecycle ---------------------------------------------------------

/** Create a new crew, add the creator as first member, return the group id. */
export async function createGroup(userId: string, name: string): Promise<string> {
  const ref = doc(collection(db, 'groups'));
  const group: Group = {
    id: ref.id,
    name,
    members: [userId],
    createdBy: userId,
    createdAt: Date.now(),
    inviteCode: makeInviteCode(),
  };
  await setDoc(ref, group);
  await updateDoc(doc(db, 'users', userId), { groupIds: arrayUnion(ref.id) });
  return ref.id;
}

/** Join a crew by its invite code. Returns the group id, or null if code is invalid. */
export async function joinGroup(userId: string, inviteCode: string): Promise<string | null> {
  const q = query(
    collection(db, 'groups'),
    where('inviteCode', '==', inviteCode.toUpperCase()),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const groupId = snap.docs[0].id;
  await updateDoc(doc(db, 'groups', groupId), { members: arrayUnion(userId) });
  await updateDoc(doc(db, 'users', userId), { groupIds: arrayUnion(groupId) });
  return groupId;
}

/** Leave a crew. */
export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), { members: arrayRemove(userId) });
  await updateDoc(doc(db, 'users', userId), { groupIds: arrayRemove(groupId) });
}

/** Read one group. */
export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? (snap.data() as Group) : null;
}

/** Every crew a user belongs to. */
export async function getMyGroups(groupIds: string[]): Promise<Group[]> {
  const groups = await Promise.all(groupIds.map(getGroup));
  return groups.filter((g): g is Group => g !== null);
}

// ---- Reading the boards -----------------------------------------------------

/** The PR leaderboard for one exercise in a crew. */
export async function getLeaderboard(
  groupId: string,
  exerciseId: string,
): Promise<LeaderboardEntry[]> {
  const snap = await getDoc(doc(db, 'groups', groupId, 'leaderboard', exerciseId));
  return snap.exists() ? (snap.data().topEntries as LeaderboardEntry[]) : [];
}

/** The streak leaderboard for a crew, already ranked. */
export async function getStreakBoard(groupId: string): Promise<StreakBoardEntry[]> {
  const snap = await getDoc(doc(db, 'groups', groupId, 'streakBoard', 'current'));
  if (!snap.exists()) return [];
  const board = snap.data() as GroupStreakBoard;
  return [...board.entries].sort((a, b) => b.currentStreak - a.currentStreak);
}

// ---- Keeping the boards current (client-side on Spark) ----------------------

/** Upsert a member's row on the streak board of every crew they're in. */
export async function syncStreakToGroups(
  groupIds: string[],
  entry: StreakBoardEntry,
): Promise<void> {
  await Promise.all(groupIds.map((groupId) => upsertStreakEntry(groupId, entry)));
}

async function upsertStreakEntry(groupId: string, entry: StreakBoardEntry): Promise<void> {
  const ref = doc(db, 'groups', groupId, 'streakBoard', 'current');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const entries: StreakBoardEntry[] = snap.exists() ? snap.data().entries ?? [] : [];
    const next = entries.filter((e) => e.userId !== entry.userId);
    next.push(entry);
    tx.set(ref, { updatedAt: Date.now(), entries: next });
  });
}

/**
 * Upsert a member's PR onto the leaderboard of each crew they're in.
 * Returns, per group, whose PR was beaten (previous #1) — useful for notifications.
 */
export async function syncPersonalRecordToGroups(
  groupIds: string[],
  entry: LeaderboardEntry,
  exerciseId: string,
): Promise<{ groupId: string; dethronedUserId: string | null }[]> {
  return Promise.all(
    groupIds.map(async (groupId) => ({
      groupId,
      dethronedUserId: await upsertLeaderboardEntry(groupId, exerciseId, entry),
    })),
  );
}

async function upsertLeaderboardEntry(
  groupId: string,
  exerciseId: string,
  entry: LeaderboardEntry,
): Promise<string | null> {
  const ref = doc(db, 'groups', groupId, 'leaderboard', exerciseId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const prev: LeaderboardEntry[] = snap.exists() ? snap.data().topEntries ?? [] : [];
    const prevLeaderId = prev.length ? prev[0].userId : null;

    const next = prev.filter((e) => e.userId !== entry.userId);
    next.push(entry);
    next.sort((a, b) => b.estimated1RM - a.estimated1RM);
    const trimmed = next.slice(0, LEADERBOARD_SIZE);
    tx.set(ref, { exerciseId, topEntries: trimmed });

    // Did this entry take #1 from someone else?
    const newLeaderId = trimmed[0].userId;
    const dethroned =
      newLeaderId === entry.userId && prevLeaderId && prevLeaderId !== entry.userId
        ? prevLeaderId
        : null;
    return dethroned;
  });
}

// ---- Supplement posts -------------------------------------------------------

/** Share a supplement result with the crew. */
export async function postSupplement(
  groupId: string,
  post: Omit<SupplementPost, 'id' | 'createdAt'>,
): Promise<void> {
  const ref = doc(collection(db, 'groups', groupId, 'supplementPosts'));
  await setDoc(ref, { ...post, id: ref.id, createdAt: Date.now() });
}

/** Read a crew's supplement posts, newest first. */
export async function getSupplementPosts(
  groupId: string,
  max = 50,
): Promise<SupplementPost[]> {
  const q = query(
    collection(db, 'groups', groupId, 'supplementPosts'),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SupplementPost);
}
