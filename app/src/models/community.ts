/**
 * Community model — social spaces (gyms, apartments, colleges, etc.)
 * DISTINCT from Group/Crew (fitness leaderboard groups in group.ts).
 *
 * Firestore layout:
 *   communities/{id}
 *   communities/{id}/members/{uid}
 *   communities/{id}/challenges/{id}
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type WorkoutVisibility =
  | 'everyone'
  | 'followers'
  | 'friends'
  | 'community'
  | 'only_me';

export type CommunityType =
  | 'gym'
  | 'apartment'
  | 'college'
  | 'office'
  | 'friends'
  | 'custom';

export type CommunityPrivacy = 'public' | 'private' | 'invite_only';

export type CommunityRole = 'admin' | 'member';

export type ChallengeMetric =
  | 'workout_count'
  | 'volume_kg'
  | 'exercise_volume'
  | 'steps'
  | 'consistency_days'
  | 'pr_count';

// ─── Community ────────────────────────────────────────────────────────────────

/** Top-level Community document — `communities/{id}`. */
export interface Community {
  id: string;
  name: string;
  type: CommunityType;
  privacy: CommunityPrivacy;
  description?: string;
  adminIds: string[]; // first element = creator
  memberCount: number; // denormalized for fast display
  trainingNowCount?: number; // how many members are actively training
  createdBy: string;
  createdAt: number;
  inviteCode?: string; // used for invite_only communities
}

/** One member's record — `communities/{communityId}/members/{uid}`. */
export interface CommunityMember {
  userId: string;
  displayName: string;
  role: CommunityRole;
  joinedAt: number;
  isTrainingNow?: boolean; // set to true when user starts a workout session
  currentActivity?: string; // e.g. "Chest - Bench Press" (only when isTrainingNow)
  activeExerciseIds?: string[]; // IDs of exercises currently being performed
  lastActive?: number; // epoch ms when they were last active/training
  workoutVisibility?: WorkoutVisibility; // their default workout visibility
}

/** A join request — `communities/{communityId}/requests/{uid}`. */
export interface CommunityJoinRequest {
  userId: string;
  displayName: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

// ─── Challenges ───────────────────────────────────────────────────────────────

/** A challenge running inside a community — `communities/{id}/challenges/{id}`. */
export interface CommunityChallenge {
  id: string;
  name: string;
  description?: string;
  metric: ChallengeMetric;
  exerciseName?: string; // used when metric is exercise_volume
  target: number; // e.g. 20 workouts, 10000 steps, 50000 kg volume
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  participantIds: string[];
  createdBy: string;
  createdAt: number;
  isActive: boolean;
  status?: 'active' | 'completed' | 'discarded' | 'expired';
}

/** One participant's progress on a challenge. */
export interface ChallengeProgress {
  userId: string;
  displayName: string;
  value: number; // e.g. 16 (workouts completed)
  rank?: number;
  joinedAt: number;
}

// ─── Community Social Post (workout share to community) ───────────────────────

/** When a user shares a workout to a community.
 *  This is the social representation — NOT the raw workout data.
 *  `communities/{communityId}/posts/{id}` */
export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  workoutId: string; // reference to user's workout — NOT the data itself
  workoutName?: string; // denormalized display name only
  workoutDate: string;
  durationMinutes?: number;
  totalVolumeKg?: number; // shown only if user permits
  prCount?: number; // shown only if user permits
  sessionId?: string; // links to duo/group session if applicable
  sessionType?: 'duo' | 'group';
  partnerNames?: string[]; // only names of partners who have community visibility
  likes: string[]; // userIds who liked
  celebrateCount: number;
  commentCount: number;
  createdAt: number;
  notes?: string;
}

/** A comment on a community post — `communities/{id}/posts/{postId}/comments/{id}`. */
export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
}

// ─── Community Achievement (shared/visible PR or milestone) ──────────────────

/** An achievement visible in a community — `communities/{id}/achievements/{id}`.
 *  Only created when the user's workout visibility allows it. */
export interface CommunityAchievement {
  id: string;
  userId: string;
  displayName: string;
  type: 'bench_pr' | 'squat_pr' | 'deadlift_pr' | 'workout_count' | 'volume_pr' | 'streak' | 'challenge_winner' | 'other';
  exerciseName?: string; // for PR types
  value: number; // kg, count, days, etc.
  reps?: number; // for PR types
  description: string; // e.g. "New Bench Press PR — 110kg × 5"
  achievedOn: string; // YYYY-MM-DD
  createdAt: number;
}

