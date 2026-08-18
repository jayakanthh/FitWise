/**
 * Follow service — one-way follow relationships.
 * DISTINCT from friendships (two-way, in friends.ts).
 *
 * Firestore layout:
 *   follows/{followerId}_{targetId}   ← Follow doc
 *
 * A → follows → B means A sees B's public activity (per B's visibility settings).
 * This does NOT create a friendship.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Follow {
  followerId: string;
  followerName: string;
  targetId: string;
  targetName: string;
  createdAt: number;
}

const followId = (followerId: string, targetId: string) => `${followerId}_${targetId}`;

/** Follow a user. Idempotent — safe to call twice. */
export async function followUser(
  follower: { id: string; name: string },
  target: { id: string; name: string },
): Promise<void> {
  const id = followId(follower.id, target.id);
  const follow: Follow = {
    followerId: follower.id,
    followerName: follower.name,
    targetId: target.id,
    targetName: target.name,
    createdAt: Date.now(),
  };
  await setDoc(doc(db, 'follows', id), follow);
}

/** Unfollow a user. */
export async function unfollowUser(followerId: string, targetId: string): Promise<void> {
  await deleteDoc(doc(db, 'follows', followId(followerId, targetId)));
}

/** Check if followerId is following targetId. */
export async function isFollowing(followerId: string, targetId: string): Promise<boolean> {
  const snap = await getDocs(
    query(
      collection(db, 'follows'),
      where('followerId', '==', followerId),
      where('targetId', '==', targetId),
    ),
  );
  return !snap.empty;
}

/** Get all users this userId is following. */
export async function getFollowing(
  userId: string,
): Promise<{ targetId: string; targetName: string; since: number }[]> {
  const snap = await getDocs(
    query(collection(db, 'follows'), where('followerId', '==', userId)),
  );
  return snap.docs.map((d) => {
    const f = d.data() as Follow;
    return { targetId: f.targetId, targetName: f.targetName, since: f.createdAt };
  });
}

/** Get all users following this userId. */
export async function getFollowers(
  userId: string,
): Promise<{ followerId: string; followerName: string; since: number }[]> {
  const snap = await getDocs(
    query(collection(db, 'follows'), where('targetId', '==', userId)),
  );
  return snap.docs.map((d) => {
    const f = d.data() as Follow;
    return { followerId: f.followerId, followerName: f.followerName, since: f.createdAt };
  });
}
