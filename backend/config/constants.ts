/**
 * backend/config/constants.ts
 *
 * Core enterprise constants, roles, departments, and venture definitions.
 */

export const ENTERPRISE_VENTURES = [
  { id: 'ae-hub',   name: 'AE Hub',   subtitle: 'E-learning & EdTech Platform', adminUrl: 'https://aehub-eafa6.web.app/staff/' },
  { id: 'mcs',      name: 'MCS',      subtitle: 'Meridian Crest Solutions — Jobs & HR', adminUrl: null },
  { id: 'awa',      name: 'AWA',      subtitle: 'African Women Association', adminUrl: null },
  { id: 'trendora', name: 'Trendora', subtitle: 'E-Commerce & Retail Platform', adminUrl: null },
] as const;

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
