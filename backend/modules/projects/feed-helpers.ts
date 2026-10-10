/**
 * backend/modules/projects/feed-helpers.ts
 *
 * Small readers shared by the merged page feeds (payments, documents,
 * training, time tracking) for raw Firestore records.
 */

export type RawRecord = Record<string, unknown>;

export const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** ISO time from a string, epoch ms or Firestore timestamp, else null. */
export function isoOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }
  const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
  if (typeof timestamp.toDate === 'function') return timestamp.toDate().toISOString();
  const seconds = timestamp.seconds ?? timestamp._seconds;
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null;
}

export const ENTERPRISE_READ_ERROR =
  "The server could not sign in to Firestore, so the enterprise's own records are not shown.";
