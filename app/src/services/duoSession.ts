/**
 * Duo / Group Session service — real-time workout coordination.
 *
 * KEY RULES:
 *  - Shared session doc = coordination only (state, readiness, exercise index).
 *  - Per-participant subcollection = their sets ONLY. Never cross-write.
 *  - Use Firestore's own offline write queue for durability. Never silently overwrite.
 *  - onSnapshot gives real-time updates to both participants.
 *
 * Firestore layout:
 *   duoSessions/{sessionId}                       ← DuoSession (shared coordination)
 *   duoSessions/{sessionId}/participants/{uid}     ← SessionParticipantMeta + sets
 *   duoSessions/{sessionId}/participants/{uid}/sets/{auto} ← ParticipantSetLog
 *   sessionInvites/{inviteId}                     ← SessionInvite (pending invitations)
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  DuoSession,
  ParticipantSetLog,
  ParticipantSummary,
  SessionInvite,
  SessionParticipantMeta,
  SessionSummary,
  SessionType,
} from '../models';
import { db } from './firebase';
import { logWorkout } from './workouts';
import { todayISO } from './dates';

// ─── Create Session ───────────────────────────────────────────────────────────

/**
 * Create a new duo/group session.
 * Called by the user who starts the invitation flow.
 */
export async function createSession(
  creatorId: string,
  creatorName: string,
  opts: {
    type: SessionType;
    exerciseIds: string[];
    exerciseNames: string[];
    planId?: string;
    planName?: string;
    communityId?: string;
  },
): Promise<string> {
  const ref = doc(collection(db, 'duoSessions'));

  const creatorMeta: SessionParticipantMeta = {
    displayName: creatorName,
    state: 'accepted',
    isReady: false,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    lastSeen: Date.now(),
  };

  const session: DuoSession = {
    id: ref.id,
    type: opts.type,
    creatorId,
    communityId: opts.communityId,
    planId: opts.planId,
    planName: opts.planName,
    exerciseIds: opts.exerciseIds,
    exerciseNames: opts.exerciseNames,
    state: 'pending',
    createdAt: Date.now(),
    participants: { [creatorId]: creatorMeta },
  };

  await setDoc(ref, session);
  return ref.id;
}

// ─── Invitations ──────────────────────────────────────────────────────────────

/** Send an invitation to a target user for an existing session. */
export async function inviteParticipant(
  sessionId: string,
  session: DuoSession,
  target: { id: string; name: string },
): Promise<string> {
  // Add participant to session doc with 'invited' state
  await updateDoc(doc(db, 'duoSessions', sessionId), {
    [`participants.${target.id}`]: {
      displayName: target.name,
      state: 'invited',
      isReady: false,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      lastSeen: Date.now(),
    } satisfies SessionParticipantMeta,
  });

  // Create invite notification doc
  const inviteRef = doc(collection(db, 'sessionInvites'));
  const invite: SessionInvite = {
    id: inviteRef.id,
    sessionId,
    sessionType: session.type,
    fromUserId: session.creatorId,
    fromUserName: session.participants[session.creatorId]?.displayName ?? 'Someone',
    toUserId: target.id,
    planName: session.planName,
    exerciseCount: session.exerciseIds.length,
    state: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
  await setDoc(inviteRef, invite);
  return inviteRef.id;
}

/** Get pending invitations for a user. */
export async function getPendingInvites(userId: string): Promise<SessionInvite[]> {
  const q = query(
    collection(db, 'sessionInvites'),
    where('toUserId', '==', userId),
    where('state', '==', 'pending'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SessionInvite, 'id'>) }));
}

/** Accept an invitation → update session participant state to 'accepted' + lobby state. */
export async function acceptInvite(inviteId: string, invite: SessionInvite): Promise<void> {
  // Mark invite as accepted
  await updateDoc(doc(db, 'sessionInvites', inviteId), { state: 'accepted' });

  // Update participant state in session
  const now = Date.now();
  await updateDoc(doc(db, 'duoSessions', invite.sessionId), {
    [`participants.${invite.toUserId}.state`]: 'accepted',
    [`participants.${invite.toUserId}.lastSeen`]: now,
    state: 'lobby',
    lobbyAt: now,
  });
}

/** Decline an invitation. */
export async function declineInvite(inviteId: string, invite: SessionInvite): Promise<void> {
  await updateDoc(doc(db, 'sessionInvites', inviteId), { state: 'declined' });
  await updateDoc(doc(db, 'duoSessions', invite.sessionId), {
    [`participants.${invite.toUserId}.state`]: 'declined',
  });
}

// ─── Lobby ────────────────────────────────────────────────────────────────────

/** Toggle ready state in the lobby. */
export async function setReady(
  sessionId: string,
  userId: string,
  isReady: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'duoSessions', sessionId), {
    [`participants.${userId}.isReady`]: isReady,
    [`participants.${userId}.state`]: isReady ? 'ready' : 'accepted',
    [`participants.${userId}.lastSeen`]: Date.now(),
  });
}

/**
 * Start the workout. Only creator can call this.
 * Sets session state to 'active' and all participants to 'active'.
 */
export async function startSession(sessionId: string, session: DuoSession): Promise<void> {
  const participantUpdates: Record<string, unknown> = {
    state: 'active',
    startedAt: Date.now(),
  };

  // Set every participant to 'active'
  const participantStateUpdates: Record<string, unknown> = {};
  for (const uid of Object.keys(session.participants)) {
    participantStateUpdates[`participants.${uid}.state`] = 'active';
  }

  await updateDoc(doc(db, 'duoSessions', sessionId), {
    ...participantStateUpdates,
    state: 'active',
    startedAt: Date.now(),
  });
}

// ─── Live Set Logging ─────────────────────────────────────────────────────────

/**
 * Log MY set. ONLY writes to MY participant subcollection.
 * Also updates my coordination state (currentExerciseIndex, currentSetIndex).
 * Never touches other participants' data.
 */
export async function logMySet(
  sessionId: string,
  userId: string,
  exerciseIndex: number,
  setLog: Omit<ParticipantSetLog, 'id'>,
): Promise<string> {
  // Write set to my subcollection
  const setRef = doc(
    collection(db, 'duoSessions', sessionId, 'participants', userId, 'sets'),
  );
  const fullLog: ParticipantSetLog = { ...setLog, id: setRef.id };
  await setDoc(setRef, fullLog);

  // Update coordination state in shared session doc
  await updateDoc(doc(db, 'duoSessions', sessionId), {
    [`participants.${userId}.currentExerciseIndex`]: exerciseIndex,
    [`participants.${userId}.currentSetIndex`]: setLog.setIndex,
    [`participants.${userId}.state`]: 'active',
    [`participants.${userId}.lastSeen`]: Date.now(),
    [`participants.${userId}.restingUntil`]: null,
  });

  return setRef.id;
}

/** Mark me as resting — updates coordination state only. */
export async function startResting(
  sessionId: string,
  userId: string,
  restSeconds: number,
): Promise<void> {
  await updateDoc(doc(db, 'duoSessions', sessionId), {
    [`participants.${userId}.state`]: 'resting',
    [`participants.${userId}.restingUntil`]: Date.now() + restSeconds * 1000,
    [`participants.${userId}.lastSeen`]: Date.now(),
  });
}

/** Mark me as done resting — back to active. */
export async function doneResting(sessionId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'duoSessions', sessionId), {
    [`participants.${userId}.state`]: 'active',
    [`participants.${userId}.restingUntil`]: null,
    [`participants.${userId}.lastSeen`]: Date.now(),
  });
}

/** Update my last-seen heartbeat (for disconnect detection). */
export async function heartbeat(sessionId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, 'duoSessions', sessionId), {
    [`participants.${userId}.lastSeen`]: Date.now(),
  });
}

// ─── Completion ───────────────────────────────────────────────────────────────

/**
 * Mark my workout as done.
 * This does NOT end the session for others — they continue independently.
 * When all participants are 'done', the session state becomes 'complete'.
 */
export async function finishMyWorkout(
  sessionId: string,
  userId: string,
  session: DuoSession,
): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(db, 'duoSessions', sessionId), {
    [`participants.${userId}.state`]: 'done',
    [`participants.${userId}.finishedAt`]: now,
    [`participants.${userId}.lastSeen`]: now,
  });

  // Check if all participants are done
  const sessionSnap = await getDoc(doc(db, 'duoSessions', sessionId));
  if (!sessionSnap.exists()) return;
  const latest = sessionSnap.data() as DuoSession;
  const allDone = Object.values(latest.participants).every(
    (p) => p.state === 'done' || p.state === 'declined' || p.state === 'disconnected',
  );
  if (allDone) {
    await updateDoc(doc(db, 'duoSessions', sessionId), {
      state: 'complete',
      completedAt: now,
    });
  }
}

/**
 * After finishing, save each participant's workout to their individual history.
 * This is the integration point with the existing logWorkout system.
 * Call once per participant from each user's device.
 */
export async function saveMyWorkoutHistory(
  sessionId: string,
  userId: string,
  session: DuoSession,
): Promise<void> {
  // Read my sets from my subcollection
  const setsSnap = await getDocs(
    query(
      collection(db, 'duoSessions', sessionId, 'participants', userId, 'sets'),
      orderBy('completedAt', 'asc'),
    ),
  );
  const sets = setsSnap.docs.map((d) => d.data() as ParticipantSetLog);

  if (sets.length === 0) return;

  // Group sets by exerciseId into WorkoutEntries
  const byExercise = new Map<string, { exerciseId: string; weightKg: number; reps: number }[]>();
  for (const s of sets) {
    const arr = byExercise.get(s.exerciseId) ?? [];
    arr.push({ exerciseId: s.exerciseId, weightKg: s.weightKg, reps: s.reps });
    byExercise.set(s.exerciseId, arr);
  }

  const entries = Array.from(byExercise.entries()).map(([exerciseId, setArr]) => ({
    exerciseId,
    sets: setArr.map(({ weightKg, reps }) => ({ weightKg, reps })),
  }));

  // Save to individual workout history via existing logWorkout
  await logWorkout(userId, {
    date: todayISO(),
    entries,
    sessionId,
    planId: session.planId ?? null,
    planName: session.planName,
    visibility: 'community', // default; user can change in share dialog
    notes: `${session.type === 'duo' ? 'Duo' : 'Group'} workout with ${
      Object.values(session.participants)
        .filter((p) => p.displayName && session.participants[userId]?.displayName !== p.displayName)
        .map((p) => p.displayName)
        .join(', ')
    }`,
  });
}

// ─── Real-time Subscriptions ──────────────────────────────────────────────────

/**
 * Subscribe to a session's shared coordination document.
 * Fires immediately with current state, then on every change.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function subscribeToSession(
  sessionId: string,
  onUpdate: (session: DuoSession) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'duoSessions', sessionId),
    (snap) => {
      if (snap.exists()) onUpdate({ id: snap.id, ...snap.data() } as DuoSession);
    },
    (err) => onError?.(err),
  );
}

/**
 * Subscribe to a participant's set logs.
 * Used by the PARTNER to see the other person's sets in real time.
 * Read-only from partner's perspective.
 */
export function subscribeToParticipantSets(
  sessionId: string,
  participantId: string,
  onUpdate: (sets: ParticipantSetLog[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'duoSessions', sessionId, 'participants', participantId, 'sets'),
      orderBy('completedAt', 'asc'),
    ),
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as ParticipantSetLog));
    },
    (err) => onError?.(err),
  );
}

/**
 * Subscribe to pending invites for a user.
 * Used by the invitee to see incoming duo/group invitations.
 */
export function subscribeToPendingInvites(
  userId: string,
  onUpdate: (invites: SessionInvite[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'sessionInvites'),
      where('toUserId', '==', userId),
      where('state', '==', 'pending'),
    ),
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SessionInvite));
    },
    (err) => onError?.(err),
  );
}

// ─── Summary Computation ──────────────────────────────────────────────────────

/** Read and compute a participant's workout summary from their set logs. */
export async function getParticipantSummary(
  sessionId: string,
  userId: string,
  displayName: string,
  startedAt: number,
): Promise<ParticipantSummary> {
  const snap = await getDocs(
    collection(db, 'duoSessions', sessionId, 'participants', userId, 'sets'),
  );
  const sets = snap.docs.map((d) => d.data() as ParticipantSetLog);

  const totalVolumeKg = sets.reduce((acc, s) => acc + s.weightKg * s.reps, 0);
  const totalReps = sets.reduce((acc, s) => acc + s.reps, 0);
  const newPRCount = sets.filter((s) => s.isNewPR).length;

  const exerciseMap = new Map<string, { exerciseName: string; count: number }>();
  for (const s of sets) {
    const e = exerciseMap.get(s.exerciseId) ?? { exerciseName: s.exerciseName, count: 0 };
    e.count++;
    exerciseMap.set(s.exerciseId, e);
  }

  return {
    userId,
    displayName,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets: sets.length,
    totalReps,
    newPRCount,
    durationMinutes: Math.round((Date.now() - startedAt) / 60000),
    exercises: Array.from(exerciseMap.entries()).map(([exerciseId, { exerciseName, count }]) => ({
      exerciseId,
      exerciseName,
      sets: count,
    })),
  };
}

/** Compute the full session summary (all participants combined). */
export async function getSessionSummary(
  session: DuoSession,
): Promise<SessionSummary> {
  const participantSummaries = await Promise.all(
    Object.entries(session.participants)
      .filter(([, p]) => p.state === 'done' || p.state === 'active')
      .map(([uid, p]) =>
        getParticipantSummary(session.id, uid, p.displayName, session.startedAt ?? session.createdAt),
      ),
  );

  const combinedVolumeKg = participantSummaries.reduce((acc, p) => acc + p.totalVolumeKg, 0);
  const totalPRs = participantSummaries.reduce((acc, p) => acc + p.newPRCount, 0);
  const durationMinutes = session.startedAt
    ? Math.round((Date.now() - session.startedAt) / 60000)
    : 0;

  return {
    sessionId: session.id,
    sessionType: session.type,
    durationMinutes,
    combinedVolumeKg,
    totalPRs,
    participants: participantSummaries,
  };
}
