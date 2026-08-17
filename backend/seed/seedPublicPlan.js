/**
 * Seed one PUBLIC plan owned by a mock user (Arjun), so the adopt-a-plan flow
 * can be tested. Dev only. Run: node seedPublicPlan.js
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

async function main() {
  const arjun = await auth.getUserByEmail('arjun@ironsync.dev');
  // grab 9 real exercises from the seeded library to fill 3 days
  const snap = await db.collection('exercises').limit(9).get();
  const ids = snap.docs.map((d) => d.id);
  if (ids.length < 9) throw new Error('Seed the exercise library first (seedExercises.js).');

  const day = (label, slice) => ({
    label,
    exercises: slice.map((exerciseId) => ({ exerciseId, targetSets: 3, targetReps: 10 })),
  });

  const ref = db.collection('plans').doc();
  await ref.set({
    id: ref.id,
    name: "Arjun's PPL",
    createdBy: arjun.uid,
    createdByName: 'Arjun Mehta',
    visibility: 'public',
    createdAt: Date.now(),
    days: [day('Push', ids.slice(0, 3)), day('Pull', ids.slice(3, 6)), day('Legs', ids.slice(6, 9))],
  });

  console.log(`✅ Seeded public plan "Arjun's PPL" (${ref.id}) — 3 days, owned by Arjun.`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
