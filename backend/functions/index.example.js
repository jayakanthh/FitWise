/**
 * TEMPLATE / SKETCH — the "someone beat your PR" Cloud Function.
 * Owner: jaikanth (backend).
 *
 * This is NOT wired up yet — it's a reference for Phase 2. When you set up
 * Cloud Functions for real (`firebase init functions`), this logic goes in the
 * generated source. Rename to index.js and adapt once the functions project exists.
 *
 * Flow (see docs/DATA_MODEL.md → "Notifications"):
 *   1. A member logs a workout that sets a new PR on an exercise.
 *   2. This function (triggered on the PR write) checks the group leaderboard.
 *   3. If the new PR beats the previous holder, notify that person (FCM) and
 *      update the group leaderboard.
 *
 * Doing this server-side (not on the phone) keeps it reliable and secure.
 */

// const functions = require('firebase-functions');
// const admin = require('firebase-admin');
// admin.initializeApp();

// exports.onPrUpdated = functions.firestore
//   .document('users/{userId}/prs/{exerciseId}')
//   .onWrite(async (change, context) => {
//     const { userId, exerciseId } = context.params;
//     const newPr = change.after.data();
//     if (!newPr) return null; // deleted
//
//     // 1. find the user's group
//     const userSnap = await admin.firestore().doc(`users/${userId}`).get();
//     const groupId = userSnap.get('friendGroupId');
//     if (!groupId) return null;
//
//     // 2. read the group leaderboard for this exercise
//     const boardRef = admin.firestore().doc(`groups/${groupId}/leaderboard/${exerciseId}`);
//     const board = await boardRef.get();
//     const previousHolder = board.exists ? board.get('topEntries')?.[0] : null;
//
//     // 3. did we beat the previous #1? (define "beat" — heavier weight? est 1RM?)
//     const beat = previousHolder && newPr.bestWeightKg > previousHolder.weightKg;
//
//     if (beat && previousHolder.userId !== userId) {
//       // send FCM push to previousHolder.userId: "🔥 X just beat your PR!"
//       // ...
//     }
//
//     // 4. rebuild/update the leaderboard doc
//     // ...
//     return null;
//   });
