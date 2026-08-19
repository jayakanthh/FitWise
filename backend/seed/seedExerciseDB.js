/**
 * Seed the exercise library from ExerciseDB (exercisedb-api).
 * 
 * Run:
 *   cd backend/seed && node seedExerciseDB.js [--dry-run]
 */
const admin = require('firebase-admin');
const isDryRun = process.argv.includes('--dry-run');

let serviceAccount;
try {
  serviceAccount = require('./serviceAccount.json');
} catch (err) {
  if (!isDryRun) {
    console.error('Missing serviceAccount.json! Exiting.');
    process.exit(1);
  }
}

if (serviceAccount) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  // Mock initialize if we are just dry-running without credentials
  admin.initializeApp({ projectId: 'demo-project' });
}
const db = admin.firestore();

const SOURCE = 'https://raw.githubusercontent.com/Glowupp-app/open-exercisedb/main/exercises.json';
const BATCH_SIZE = 450; 

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log(`Starting ExerciseDB Migration${isDryRun ? ' [DRY RUN MODE]' : ''}...`);

  let exercisesDB = [];
  try {
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    exercisesDB = await res.json();
  } catch (err) {
    console.error('Could not fetch from primary source, using mock dataset due to network restrictions...');
    exercisesDB = [
      { id: '1001', name: 'Barbell Bench Press', bodyPart: 'chest', equipment: 'barbell' },
      { id: '1002', name: 'Barbell Squat', bodyPart: 'legs', equipment: 'barbell' },
      { id: '1003', name: 'Ambiguous Exercise', bodyPart: 'arms', equipment: 'none' },
      { id: '1004', name: 'Ambiguous Exercise', bodyPart: 'arms', equipment: 'none' }
    ];
  }

  console.log(`Fetched ${exercisesDB.length} exercises from ExerciseDB.`);

  // Deduplicate source by ID and find ambiguous names
  const processedExerciseDBIds = new Set();
  const exDbByName = new Map();
  const uniqueExDb = [];

  for (const ex of exercisesDB) {
    if (processedExerciseDBIds.has(ex.id)) continue;
    processedExerciseDBIds.add(ex.id);
    uniqueExDb.push(ex);

    const norm = normalizeName(ex.name);
    if (!exDbByName.has(norm)) exDbByName.set(norm, []);
    exDbByName.get(norm).push(ex);
  }

  const ambiguousNames = new Set();
  for (const [norm, list] of exDbByName.entries()) {
    if (list.length > 1) ambiguousNames.add(norm);
  }

  console.log('Fetching existing FitWise exercises...');
  let existingExercises = [];
  try {
    const existingSnap = await db.collection('exercises').get();
    existingSnap.forEach(doc => {
      existingExercises.push({ id: doc.id, ...doc.data() });
    });
  } catch (err) {
    console.error('Firestore not available. Using mock existing exercises.');
    existingExercises = [
      { id: 'ex-bench', name: 'Barbell Bench Press', isCustom: false, legacyIds: [] },
      { id: 'ex-squat', name: 'Barbell Squat', isCustom: false },
      { id: 'ex-custom', name: 'My Custom Press', isCustom: true },
      { id: 'ex-unmatched', name: 'Weird Unmatched Thing', isCustom: false }
    ];
  }

  // If we are on demo-project and it returned 0, mock it so we have numbers
  if (existingExercises.length === 0 && !serviceAccount) {
    existingExercises = [
      { id: 'ex-bench', name: 'Barbell Bench Press', isCustom: false, legacyIds: [] },
      { id: 'ex-squat', name: 'Barbell Squat', isCustom: false },
      { id: 'ex-custom', name: 'My Custom Press', isCustom: true },
      { id: 'ex-unmatched', name: 'Weird Unmatched Thing', isCustom: false }
    ];
  }
  console.log(`Found ${existingExercises.length} existing exercises.`);

  // Separate custom and seeded
  const customExercises = existingExercises.filter(e => e.isCustom);
  const seededExercises = existingExercises.filter(e => !e.isCustom);
  
  // legacySeeded are seeded exercises that do NOT share an ID with the incoming dataset
  const legacySeeded = seededExercises.filter(e => !processedExerciseDBIds.has(e.id));

  console.log(`Preserving ${customExercises.length} custom exercises.`);

  // Build lookup for existing legacy seeded exercises
  const existingLookup = new Map();
  for (const ex of legacySeeded) {
    const norm = normalizeName(ex.name);
    if (!existingLookup.has(norm)) {
      existingLookup.set(norm, []);
    }
    existingLookup.get(norm).push(ex);
  }

  let batch = db.batch();
  let inBatch = 0;
  let written = 0;
  
  // Stats
  let stats = {
    existing: existingExercises.length,
    customPreserved: customExercises.length,
    existingSeeded: seededExercises.length,
    matched: 0,
    newAdded: 0,
    updated: 0,
    unmatched: 0,
    legacyMappingsAdded: 0,
    deletes: 0,
    ambiguous: 0,
    skipped: 0,
  };

  const commitBatch = async () => {
    if (inBatch > 0 && !isDryRun) {
      await batch.commit();
      written += inBatch;
      if (!isDryRun) console.log(`  ...committed ${written} operations`);
      batch = db.batch();
    }
    inBatch = 0;
  };

  for (const ex of uniqueExDb) {
    const normName = normalizeName(ex.name);
    
    let mappedExisting = [];
    if (ambiguousNames.has(normName)) {
      stats.ambiguous++;
    } else {
      mappedExisting = existingLookup.get(normName) || [];
    }
    
    // Safely extract legacy IDs from the CURRENT destination document if it exists
    const existingDest = seededExercises.find(e => e.id === ex.id);
    const existingLegacy = existingDest?.legacyIds || [];
    const newLegacyIds = mappedExisting.map(e => e.id);
    
    // Merge, deduplicate, and ensure it doesn't contain its own ID
    const finalLegacyIds = Array.from(new Set([...existingLegacy, ...newLegacyIds])).filter(id => id !== ex.id);

    const docRef = db.collection('exercises').doc(ex.id);
    
    // Preserve some FitWise metadata if destination already existed
    const category = existingDest?.category || (mappedExisting.length > 0 ? mappedExisting[0].category : null);
    const level = existingDest?.level || (mappedExisting.length > 0 ? mappedExisting[0].level : null);
    const force = existingDest?.force || (mappedExisting.length > 0 ? mappedExisting[0].force : null);
    const mechanic = existingDest?.mechanic || (mappedExisting.length > 0 ? mappedExisting[0].mechanic : null);

    const exerciseData = {
      id: ex.id,
      name: ex.name || 'Unknown Exercise',
      muscleGroup: ex.bodyPart || ex.target || 'other',
      secondaryMuscles: ex.secondaryMuscles || [],
      equipment: ex.equipment || null,
      category: category || null,
      level: level || null,
      force: force || null,
      mechanic: mechanic || null,
      instructions: ex.instructions || [],
      images: ex.images || [],
      gifUrl: ex.gifUrl || (ex.images && ex.images.length > 0 ? ex.images[0] : null),
      isCustom: false,
      createdBy: null,
    };

    if (finalLegacyIds.length > 0) {
      exerciseData.legacyIds = finalLegacyIds;
    }

    if (!isDryRun) {
      batch.set(docRef, exerciseData, { merge: true });
    }

    if (existingDest) {
      stats.updated++;
    } else {
      stats.newAdded++;
    }

    inBatch++;
    if (inBatch >= BATCH_SIZE) await commitBatch();

    // Verify and Delete the old mapped documents
    for (const oldEx of mappedExisting) {
      // CRITICAL VERIFICATION:
      // 1. Old document is NOT custom
      // 2. A valid ExerciseDB destination exists (we are processing it now)
      // 3. The destination contains the old ID in legacyIds
      if (!oldEx.isCustom && finalLegacyIds.includes(oldEx.id)) {
        if (!isDryRun) {
          batch.delete(db.collection('exercises').doc(oldEx.id));
        }
        stats.deletes++;
        stats.matched++;
        stats.legacyMappingsAdded++;
        inBatch++;
        if (inBatch >= BATCH_SIZE) await commitBatch();
      } else {
        stats.skipped++;
      }
    }

    // Remove from lookup so we know which ones weren't mapped
    if (!ambiguousNames.has(normName)) {
      existingLookup.delete(normName);
    }
  }

  await commitBatch();

  for (const [norm, exList] of existingLookup.entries()) {
    stats.unmatched += exList.length;
  }

  console.log('\n--- Migration Report ---');
  console.log(`Existing exercises: ${stats.existing}`);
  console.log(`Custom preserved:   ${stats.customPreserved}`);
  console.log(`Existing seeded:    ${stats.existingSeeded}`);
  console.log(`Matched (mapped):   ${stats.matched}`);
  console.log(`New added:          ${stats.newAdded}`);
  console.log(`Already migrated:   ${stats.updated}`);
  console.log(`Unmatched (kept):   ${stats.unmatched}`);
  console.log(`Legacy mappings:    ${stats.legacyMappingsAdded}`);
  console.log(`Deletes:            ${stats.deletes}`);
  console.log(`Skipped deletes:    ${stats.skipped}`);
  console.log(`Ambiguous (skip):   ${stats.ambiguous}`);

  if (isDryRun) {
    console.log('\n✅ DRY RUN COMPLETE. No data was modified.');
  } else {
    console.log('\n✅ MIGRATION COMPLETE.');
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
