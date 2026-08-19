/**
 * TEMPLATE — copy this file to `firebaseConfig.ts` and fill in your project's values.
 *
 *   cp src/services/firebaseConfig.example.ts src/services/firebaseConfig.ts
 *
 * Get these from: Firebase console → Project settings → "Your apps" → SDK setup & config.
 *
 * NOTE: these Firebase web-config values are NOT secrets (they ship in the client
 * anyway) — the real protection is Firestore Security Rules (see backend/firestore.rules).
 * We still keep the file out of git so each person points at their own project/env
 * and we don't hardcode one shared project.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyD0RlvIoNGfwJFLHvKfqk4AC_BUVxTFg14",
  authDomain: "ironsync-d58ed.firebaseapp.com",
  projectId: "ironsync-d58ed",
  storageBucket: "ironsync-d58ed.firebasestorage.app",
  messagingSenderId: "885238062879",
  appId: "1:885238062879:web:09e3ccb2a16788b2701a2a",
  measurementId: "G-QJ2G19T355"
};