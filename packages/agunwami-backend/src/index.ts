// ─── agunwami-backend ─────────────────────────────────────────────────────────
// Single import surface for both aehub-onboarding and agunwami-enterprise.
//
// Usage:
//   import { UserProfile, clockIn, subscribeToday, DEFAULT_SHIFT_START } from 'agunwami-backend';
//
// Setup (once per app, in your Firebase init file or root layout):
//   import { initBackend } from 'agunwami-backend';
//   import { db } from '@/lib/firebase'; // your app's own firebase.ts
//   initBackend(db);
// ─────────────────────────────────────────────────────────────────────────────

// ── Constants ─────────────────────────────────────────────────────────────────
export * from './constants/shift';

// ── Types & Helpers ───────────────────────────────────────────────────────────
export * from './types/user';
export type * from './types/time-tracking';
export type * from './types/leave';
export type * from './types/task';
export type * from './types/notification';
export type * from './types/payment';
export type * from './types/staff';

// ── Utils ─────────────────────────────────────────────────────────────────────
export * from './utils/time';
export * from './utils/shift';

// ── Services ─────────────────────────────────────────────────────────────────
export { initBackend, getDb }         from './services/firebase-instance';
export { subscribeUserProfile }       from './services/user-profile';
export {
  clockIn, clockOut, startBreak, resumeWork,
  subscribeToday, subscribeMonthlySummary, subscribeLiveTeam,
  getDay, computeLiveTotals,
  todayId, monthId,
}                                      from './services/time-tracking';
export {
  subscribeLeaveRequests,
}                                      from './services/leave';
export {
  subscribeTasks,
  subscribeStaffTasks,
  createStaffTask,
  updateStaffTask,
  deleteStaffTask,
  fetchStaffUserNames,
}                                      from './services/tasks';
export {
  subscribeNotifications,
  markNotifRead,
  markAllNotifsRead,
  routeForNotif,
}                                      from './services/notifications';
export { subscribePayments }           from './services/payments';
export { subscribeStaff }              from './services/staff';
