/** A private crew of friends. A user can belong to several (see User.groupIds). */
export interface Group {
  id: string;
  name: string;
  members: string[]; // userIds — kept in sync with each member's groupIds
  createdBy: string;
  createdAt: number;
  inviteCode?: string; // short code friends use to join
}

/** One row on the PR leaderboard for an exercise. Ranked by estimated1RM. */
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  estimated1RM: number; // what we rank by
  weightKg: number; // the actual set behind it
  reps: number;
  date: string; // YYYY-MM-DD
}

/** Denormalized PR leaderboard for one exercise within a group. */
export interface GroupLeaderboard {
  exerciseId: string;
  topEntries: LeaderboardEntry[];
}

/** One row on the streak leaderboard. */
export interface StreakBoardEntry {
  userId: string;
  displayName: string;
  currentStreak: number;
  longestStreak: number;
}

/** Denormalized streak leaderboard — the whole crew's streaks ranked. */
export interface GroupStreakBoard {
  updatedAt: number;
  entries: StreakBoardEntry[]; // sort by currentStreak to rank
}

/** A supplement result shared with the crew. */
export interface SupplementPost {
  id: string;
  authorId: string;
  supplementName: string; // "Creatine Monohydrate"
  note: string; // "week 4, strength clearly up"
  rating?: number; // optional 1–5
  createdAt: number;
}
