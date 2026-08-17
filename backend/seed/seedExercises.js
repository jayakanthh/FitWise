/**
 * Seed the exercise library from free-exercise-db (public domain, ~800 exercises).
 * Owner: jaikanth (backend). Source: https://github.com/yuhonas/free-exercise-db
 *
 * Run once (needs ./serviceAccount.json — see README):
 *   cd backend/seed && node seedExercises.js
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const BATCH_SIZE = 450; // Firestore caps a batch at 500

async function main() {
  console.log('Fetching free-exercise-db…');
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const exercises = await res.json();
  console.log(`Got ${exercises.length} exercises. Writing to Firestore…`);

  let batch = db.batch();
  let inBatch = 0;
  let written = 0;
  for (const ex of exercises) {
    const images = (ex.images || []).map((p) => IMG_BASE + p);
    batch.set(db.doc(`exercises/${ex.id}`), {
      id: ex.id,
      name: ex.name,
      muscleGroup: (ex.primaryMuscles && ex.primaryMuscles[0]) || ex.category || 'other',
      secondaryMuscles: ex.secondaryMuscles || [],
      equipment: ex.equipment || null,
      category: ex.category || null,
      level: ex.level || null,
      force: ex.force || null,
      mechanic: ex.mechanic || null,
      instructions: ex.instructions || [],
      images,
      gifUrl: images[0] || null, // library thumbnail
      isCustom: false,
      createdBy: null,
    });
    if (++inBatch === BATCH_SIZE) {
      await batch.commit();
      written += inBatch;
      console.log(`  …${written}`);
      batch = db.batch();
      inBatch = 0;
    }
  }
  if (inBatch > 0) {
    await batch.commit();
    written += inBatch;
  }
  console.log(`✅ Seeded ${written} exercises into the library.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
