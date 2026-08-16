/**
 * Seed mock users + a populated crew into Firestore (dev only).
 * Owner: jaikanth (backend).
 *
 * Creates 5 mock IronSync users (Auth + profile), puts them in a crew called
 * "Iron Squad" with a FIXED invite code "IRON01", and fills the streak
 * leaderboard — so you can open the app, Group tab → Join → "IRON01" and
 * immediately see a full leaderboard.
 *
 * Run once (see backend/seed/README.md):
 *   cd backend/seed && npm install && node seedMockData.js
 *
 * Needs a service-account key at ./serviceAccount.json (gitignored) — download
 * it from Firebase console → Project settings → Service accounts → Generate key.
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

console.log(`Using service account for project: ${serviceAccount.project_id}`);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

const GROUP_ID = 'iron-squad';
const INVITE_CODE = 'IRON01';
const BENCH_ID = 'bench-press';

// name, email, password, and stats. Streaks drive the leaderboard.
const MOCK_USERS = [
  { name: 'Arjun Mehta',   email: 'arjun@ironsync.dev',  goal: 'bulk',     age: 24, heightCm: 178, weightKg: 82, trainingDays: [1, 3, 5],       currentStreak: 12, longestStreak: 20, benchKg: 100, benchReps: 5 },
  { name: 'Rohan Kapoor',  email: 'rohan@ironsync.dev',  goal: 'cut',      age: 27, heightCm: 182, weightKg: 88, trainingDays: [1, 2, 4, 6],    currentStreak: 8,  longestStreak: 15, benchKg: 110, benchReps: 3 },
  { name: 'Kabir Singh',   email: 'kabir@ironsync.dev',  goal: 'maintain', age: 22, heightCm: 175, weightKg: 74, trainingDays: [0, 2, 4],       currentStreak: 21, longestStreak: 21, benchKg: 90,  benchReps: 6 },
  { name: 'Vikram Rao',    email: 'vikram@ironsync.dev', goal: 'bulk',     age: 30, heightCm: 185, weightKg: 95, trainingDays: [1, 3, 5, 6],    currentStreak: 5,  longestStreak: 30, benchKg: 130, benchReps: 2 },
  { name: 'Sana Iyer',     email: 'sana@ironsync.dev',   goal: 'cut',      age: 26, heightCm: 168, weightKg: 63, trainingDays: [2, 4, 6],       currentStreak: 15, longestStreak: 18, benchKg: 65,  benchReps: 5 },
];

const PASSWORD = 'ironsync123'; // all mock users share this — dev only
const TODAY = new Date().toISOString().slice(0, 10);

// Epley estimated 1RM — must match app/src/models/workout.ts
const e1rm = (kg, reps) => (reps <= 1 ? kg : Math.round(kg * (1 + reps / 30) * 10) / 10);

async function upsertUser(u) {
  process.stdout.write(`  • ${u.name} (${u.email}) … `);
  let uid;
  try {
    uid = (await auth.createUser({ email: u.email, password: PASSWORD, displayName: u.name })).uid;
    console.log('created');
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      uid = (await auth.getUserByEmail(u.email)).uid;
      console.log('already existed, reusing');
    } else throw e;
  }
  await db.doc(`users/${uid}`).set({
    id: uid,
    displayName: u.name,
    email: u.email,
    age: u.age,
    heightCm: u.heightCm,
    weightKg: u.weightKg,
    goal: u.goal,
    createdAt: Date.now(),
    onboarded: true,
    trainingDays: u.trainingDays,
    currentStreak: u.currentStreak,
    longestStreak: u.longestStreak,
    lastTrainedDate: TODAY,
    groupIds: [GROUP_ID],
  });
  return { ...u, uid };
}

async function main() {
  console.log('Seeding mock users…');
  const users = [];
  for (const u of MOCK_USERS) users.push(await upsertUser(u));

  // The crew
  await db.doc(`groups/${GROUP_ID}`).set({
    id: GROUP_ID,
    name: 'Iron Squad',
    members: users.map((u) => u.uid),
    createdBy: users[0].uid,
    createdAt: Date.now(),
    inviteCode: INVITE_CODE,
  });

  // Streak leaderboard (what the Group screen shows)
  await db.doc(`groups/${GROUP_ID}/streakBoard/current`).set({
    updatedAt: Date.now(),
    entries: users.map((u) => ({
      userId: u.uid,
      displayName: u.name,
      currentStreak: u.currentStreak,
      longestStreak: u.longestStreak,
    })),
  });

  // A bench-press PR leaderboard too
  await db.doc(`exercises/${BENCH_ID}`).set({
    id: BENCH_ID,
    name: 'Barbell Bench Press',
    muscleGroup: 'chest',
    equipment: 'barbell',
    isCustom: false,
    createdBy: null,
  });
  const topEntries = users
    .map((u) => ({
      userId: u.uid,
      displayName: u.name,
      estimated1RM: e1rm(u.benchKg, u.benchReps),
      weightKg: u.benchKg,
      reps: u.benchReps,
      date: TODAY,
    }))
    .sort((a, b) => b.estimated1RM - a.estimated1RM);
  await db.doc(`groups/${GROUP_ID}/leaderboard/${BENCH_ID}`).set({ exerciseId: BENCH_ID, topEntries });

  console.log(`\n✅ Seeded ${users.length} users into crew "Iron Squad".`);
  console.log(`   Join it in the app:  Group tab → Join with a code → ${INVITE_CODE}`);
  console.log(`   Mock logins:  <name>@ironsync.dev  /  ${PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
