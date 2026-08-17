/**
 * Friends service — 1-to-1 friend requests & friendships.
 * Owner: jaikanth (backend).
 *
 * Requests: friendRequests/{id} { fromId, toId, ... }.
 * Friendships: friendships/{sortedPairId} { members:[a,b], names, since } — keyed
 * by the sorted id pair so either friend can read/write it.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { FriendRequest, Friendship } from '../models';
import { db } from './firebase';

const pairId = (a: string, b: string) => [a, b].sort().join('_');

/** Send a friend request to a user found by email. Returns an error message or null. */
export async function sendFriendRequest(
  from: { id: string; name: string },
  toEmail: string,
): Promise<string | null> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('email', '==', toEmail.trim().toLowerCase()), limit(1)),
  );
  if (snap.empty) return 'No IronSync user with that email.';
  const target = snap.docs[0];
  if (target.id === from.id) return "That's you!";

  // already friends?
  const existing = await getDocs(
    query(collection(db, 'friendships'), where('members', 'array-contains', from.id)),
  );
  if (existing.docs.some((d) => (d.data().members as string[]).includes(target.id))) {
    return 'You two are already friends.';
  }

  await addDoc(collection(db, 'friendRequests'), {
    fromId: from.id,
    fromName: from.name,
    toId: target.id,
    toName: target.get('displayName') ?? '',
    createdAt: Date.now(),
  });
  return null;
}

/** Requests sent TO this user (to accept/decline). */
export async function getIncomingRequests(userId: string): Promise<FriendRequest[]> {
  const snap = await getDocs(
    query(collection(db, 'friendRequests'), where('toId', '==', userId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) }));
}

/** Accept a request → create the friendship, remove the request. */
export async function acceptRequest(req: FriendRequest): Promise<void> {
  const id = pairId(req.fromId, req.toId);
  const friendship: Friendship = {
    id,
    members: [req.fromId, req.toId],
    names: { [req.fromId]: req.fromName, [req.toId]: req.toName },
    since: Date.now(),
  };
  await setDoc(doc(db, 'friendships', id), friendship);
  await deleteDoc(doc(db, 'friendRequests', req.id));
}

/** Decline (delete) a request. */
export async function declineRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendRequests', requestId));
}

/** This user's friends (mapped to the other person). */
export async function getFriends(
  userId: string,
): Promise<{ friendId: string; name: string; since: number }[]> {
  const snap = await getDocs(
    query(collection(db, 'friendships'), where('members', 'array-contains', userId)),
  );
  return snap.docs.map((d) => {
    const f = d.data() as Friendship;
    const friendId = f.members.find((m) => m !== userId) ?? userId;
    return { friendId, name: f.names[friendId] ?? 'Friend', since: f.since };
  });
}

/** Remove a friend (deletes the friendship both ways). */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendships', pairId(userId, friendId)));
}
