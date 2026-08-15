/**
 * IronSync Cloud Functions — the authoritative, server-side version of the crew
 * board logic and the "someone beat your PR" push notification.
 * Owner: jaikanth (backend).
 *
 * ⚠️ REQUIRES THE BLAZE PLAN. Cloud Functions won't deploy on the free Spark
 * plan. Until then, the app updates crew boards client-side (app/src/services/
 * groups.ts). When you enable Blaze and deploy this, REMOVE the client-side
 * board sync (the syncStreakToGroups / syncPersonalRecordToGroups calls in
 * workouts.ts) so the boards aren't written twice.
 *
 * Push notifications use Expo Push (https://docs.expo.dev/push-notifications/),
 * which is free and works from any server. Each user stores an `expoPushToken`
 * on their profile when the app registers for notifications.
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const LEADERBOARD_SIZE = 10;

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  estimated1RM: number;
  weightKg: number;
  reps: number;
  date: string;
}

/**
 * When a user's PR doc changes, refresh the leaderboard of every crew they're in
 * and notify anyone they knocked off the #1 spot.
 */
export const onPersonalRecordWritten = onDocumentWritten(
  'users/{userId}/prs/{exerciseId}',
  async (event) => {
    const { userId, exerciseId } = event.params;
    const after = event.data?.after.data();
    if (!after) return; // PR deleted — nothing to do

    const userSnap = await db.doc(`users/${userId}`).get();
    const user = userSnap.data();
    if (!user) return;

    const groupIds: string[] = user.groupIds ?? [];
    const entry: LeaderboardEntry = {
      userId,
      displayName: user.displayName ?? 'Someone',
      estimated1RM: after.estimated1RM,
      weightKg: after.bestWeightKg,
      reps: after.bestReps,
      date: after.achievedOn,
    };

    for (const groupId of groupIds) {
      const dethronedUserId = await upsertLeaderboard(groupId, exerciseId, entry);
      if (dethronedUserId && dethronedUserId !== userId) {
        await notifyDethroned(dethronedUserId, entry.displayName, exerciseId);
      }
    }
  },
);

/** Upsert an entry onto a crew's leaderboard; return the previous #1 if replaced. */
async function upsertLeaderboard(
  groupId: string,
  exerciseId: string,
  entry: LeaderboardEntry,
): Promise<string | null> {
  const ref = db.doc(`groups/${groupId}/leaderboard/${exerciseId}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev: LeaderboardEntry[] = snap.exists ? snap.get('topEntries') ?? [] : [];
    const prevLeaderId = prev.length ? prev[0].userId : null;

    const next = prev.filter((e) => e.userId !== entry.userId);
    next.push(entry);
    next.sort((a, b) => b.estimated1RM - a.estimated1RM);
    const trimmed = next.slice(0, LEADERBOARD_SIZE);
    tx.set(ref, { exerciseId, topEntries: trimmed });

    const dethroned =
      trimmed[0].userId === entry.userId && prevLeaderId && prevLeaderId !== entry.userId
        ? prevLeaderId
        : null;
    return dethroned;
  });
}

/** Send an Expo push notification to the user whose PR was beaten. */
async function notifyDethroned(
  dethronedUserId: string,
  beaterName: string,
  exerciseId: string,
): Promise<void> {
  const snap = await db.doc(`users/${dethronedUserId}`).get();
  const token = snap.get('expoPushToken');
  if (!token) {
    logger.info(`No push token for ${dethronedUserId}; skipping notification`);
    return;
  }

  const message = {
    to: token,
    sound: 'default',
    title: '🔥 Someone beat your PR!',
    body: `${beaterName} just topped your ${exerciseId} — go take it back.`,
    data: { type: 'pr_beaten', exerciseId },
  };

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!res.ok) logger.warn(`Expo push failed: ${res.status} ${await res.text()}`);
  } catch (err) {
    logger.error('Expo push error', err);
  }
}
