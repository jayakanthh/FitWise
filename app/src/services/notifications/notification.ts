import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { AppNotification } from '../../models/index';
import { db } from '../../config/firebase';

/** Create a notification. */
export async function createNotification(
  userId: string,
  notification: Omit<AppNotification, 'id' | 'userId' | 'read' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'notifications'), {
    ...notification,
    userId,
    read: false,
    createdAt: Date.now(),
  });
  return ref.id;
}

/** Get list of notifications for a user, newest first. */
export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }));
}

/** Subscribe to real-time notification updates. */
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (err: Error) => void,
) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppNotification, 'id'>),
      }));
      onUpdate(list);
    },
    (err) => {
      if (onError) onError(err);
    },
  );
}

/** Mark a single notification as read. */
export async function markAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

/** Mark all notifications as read for a user. */
export async function markAllAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { read: true });
  });
  await batch.commit();
}
