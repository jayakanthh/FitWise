/**
 * IronSync shared data models — the CONTRACT between backend (jaikanth) and UI (Pruthvi).
 *
 * These TypeScript types mirror the Firestore data model in docs/DATA_MODEL.md.
 * When the shape of data changes, change it HERE first, then both sides update.
 * This is what lets us work on backend and UI in parallel without guessing.
 */

export * from './user';
export * from './workout';
export * from './friend';
export * from './group';
export * from './nutrition';
export * from './community';
export * from './session';
export * from './measurement';
export * from './notification';
