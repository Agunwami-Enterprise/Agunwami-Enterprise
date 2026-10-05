/**
 * backend/config/constants.ts
 *
 * Core enterprise constants, roles, departments, and venture definitions.
 */

export const DEPARTMENTS = [
  'ceo',
  'operations',
  'hr',
  'finance',
  'content',
  'marketing',
  'engineering',
  'support',
] as const;

export type Department = typeof DEPARTMENTS[number];

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  COURSES: 'courses',
  ATTENDANCE_LOGS: 'attendanceLogs',
  ANALYTICS_SNAPSHOTS: 'analytics_snapshots',
  LEAVE_REQUESTS: 'leaveRequests',
  PAYMENTS: 'payments',
  ANNOUNCEMENTS: 'announcements',
  TASKS: 'tasks',
  STAFF_TASKS: 'staffTasks',
  DOCUMENTS: 'documents',
  METADATA: 'metadata',
} as const;
