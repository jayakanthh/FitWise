/**
 * Services barrel — the app's whole backend surface in one import.
 * UI can do:  import { logWorkout, getStreakBoard } from '../services';
 * Owner: jaikanth (backend).
 */
export * from './auth';
export * from './users';
export * from './profile';
export * from './workouts';
export * from './exercises';
export * from './plans';
export * from './groups';
export * from './friends';
export * from './nutrition';
export * from './streaks';
export * from './dates';
export * from './community';
export * from './follow';
export * from './duoSession';
export { auth, db } from './firebase';
