// ─── Settings / User Profile — Thin Re-export ─────────────────────────────────
// All types and logic now live in agunwami-backend.
// This file keeps existing imports (@/modules/settings/services) working.

export type { AccountStatus, ShiftStatus, UserProfile } from 'agunwami-backend';
export { subscribeUserProfile }                          from 'agunwami-backend';
