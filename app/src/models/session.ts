/**
 * Duo / Group Session model — real-time workout coordination.
 *
 * KEY PRINCIPLE: shared session structure, entirely separate per-participant performance.
 *
 * Firestore layout:
 *   duoSessions/{sessionId}                            ← shared session doc
 *   duoSessions/{sessionId}/participants/{uid}         ← per-participant live state
 *   duoSessions/{sessionId}/participants/{uid}/sets    ← per-participant set logs (subcollection)
 *
 * NEVER merge performance data across participants.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SessionType = 'duo' | 'group';

export type SessionState =
  | 'pending'     // invitation sent, not yet accepted by all
  | 'lobby'       // all accepted, waiting for ready + explicit start
  | 'active'      // workout in progress
  | 'complete'    // all participants have finished
  | 'cancelled';  // cancelled before start

export type ParticipantState =
  | 'invited'       // invitation sent, not yet responded
  | 'accepted'      // accepted, entering lobby
  | 'declined'      // declined invitation
  | 'ready'         // in lobby, toggled ready
  | 'active'        // in workout, logging sets
  | 'resting'       // between sets, rest timer running
  | 'done'          // finished their workout
  | 'disconnected'; // lost connection

// ─── Shared Session Document ──────────────────────────────────────────────────

/**
 * The shared session doc — `duoSessions/{sessionId}`.
 * Contains coordination data ONLY. No individual performance data here.
 */
export interface DuoSession {
  id: string;
  type: SessionType;
  creatorId: string;
  communityId?: string; // if started from a community

  // Workout structure (what everyone does — same for all participants)
  planId?: string; // optional: linked plan
  planName?: string; // denormalized for display
  exerciseIds: string[]; // ordered list of exercises
  exerciseNames: string[]; // denormalized for display

  // Session lifecycle
  state: SessionState;
  createdAt: number;
  lobbyAt?: number;    // when all accepted and entered lobby
  startedAt?: number;  // when workout was explicitly started
  completedAt?: number; // when all participants finished

  // Participants — keyed by userId, contains ONLY coordination metadata
  participants: Record<string, SessionParticipantMeta>;
}

/** Per-participant coordination metadata stored in the shared session doc.
 *  This is ONLY state — never performance data. */
export interface SessionParticipantMeta {
  displayName: string;
  state: ParticipantState;
  isReady: boolean;           // ready to start in lobby
  currentExerciseIndex: number; // which exercise they're on
  currentSetIndex: number;    // which set they're on
  lastSeen: number;           // epoch ms — for disconnect detection
  restingUntil?: number;      // epoch ms — when rest timer ends (null = not resting)
  finishedAt?: number;        // epoch ms — when they completed their workout
}

// ─── Per-Participant Set Logs ─────────────────────────────────────────────────

/**
 * One logged set — stored in:
 * `duoSessions/{sessionId}/participants/{uid}/sets/{auto-id}`
 *
 * Each participant ONLY writes to their own subcollection.
 * Security rules enforce this.
 */
export interface ParticipantSetLog {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setIndex: number;      // 0-based
  weightKg: number;
  reps: number;
  rir?: number;          // reps in reserve
  rpe?: number;          // rate of perceived exertion
  notes?: string;
  isNewPR?: boolean;     // did this set beat user's stored PR?
  completedAt: number;   // epoch ms
}

// ─── Session Invitation ───────────────────────────────────────────────────────

/**
 * Pending session invitation — `sessionInvites/{inviteId}`.
 * Used to surface the invite to the target user.
 */
export interface SessionInvite {
  id: string;
  sessionId: string;
  sessionType: SessionType;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  planName?: string;
  exerciseCount?: number;
  estimatedMinutes?: number;
  state: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  createdAt: number;
  expiresAt: number; // auto-expire after 10 minutes
}

// ─── Session Summary ──────────────────────────────────────────────────────────

/** Per-participant summary computed at end-of-workout. */
export interface ParticipantSummary {
  userId: string;
  displayName: string;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  newPRCount: number;
  durationMinutes: number;
  exercises: { exerciseId: string; exerciseName: string; sets: number }[];
}

/** The combined session summary shown at DuoComplete. */
export interface SessionSummary {
  sessionId: string;
  sessionType: SessionType;
  durationMinutes: number;
  combinedVolumeKg: number;
  totalPRs: number;
  participants: ParticipantSummary[];
}
