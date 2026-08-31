// ─── Shift Utilities ──────────────────────────────────────────────────────────
import { DEFAULT_SHIFT_END, DEFAULT_SHIFT_START } from '../constants/shift';

/**
 * Parses a "HH:mm" shift time string into total minutes from midnight.
 * Falls back to `defaultMins` if the string is missing or malformed.
 *
 * @example parseTimeToMinutes("09:00", 540) → 540
 * @example parseTimeToMinutes("17:30", 1020) → 1050
 */
export function parseTimeToMinutes(timeStr: string | undefined, defaultMins: number): number {
  if (!timeStr) return defaultMins;
  const parts = timeStr.split(':');
  if (parts.length < 2) return defaultMins;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return isNaN(h) || isNaN(m) ? defaultMins : h * 60 + m;
}

/**
 * Returns the shift start time in minutes from midnight for a given user,
 * defaulting to DEFAULT_SHIFT_START (09:00 → 540 mins) if unassigned.
 */
export function getShiftStartMins(shiftStartTime?: string): number {
  const defaultMins = parseTimeToMinutes(DEFAULT_SHIFT_START, 9 * 60);
  return parseTimeToMinutes(shiftStartTime, defaultMins);
}

/**
 * Returns the shift end time in minutes from midnight for a given user,
 * defaulting to DEFAULT_SHIFT_END (17:00 → 1020 mins) if unassigned.
 */
export function getShiftEndMins(shiftEndTime?: string): number {
  const defaultMins = parseTimeToMinutes(DEFAULT_SHIFT_END, 17 * 60);
  return parseTimeToMinutes(shiftEndTime, defaultMins);
}

/**
 * Checks whether the current time falls within the user's shift window.
 * Applies a 2-minute grace period before the shift start time.
 *
 * @param now           Current time as a Date object
 * @param shiftStartTime  User's assigned shift start, e.g. "09:00"
 * @param shiftEndTime    User's assigned shift end, e.g. "17:00"
 */
export function isWithinShiftWindow(
  now: Date,
  shiftStartTime?: string,
  shiftEndTime?: string,
): boolean {
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const startMins    = getShiftStartMins(shiftStartTime);
  const endMins      = getShiftEndMins(shiftEndTime);
  const windowStart  = Math.max(0, startMins - 2); // 2 min grace period
  return totalMinutes >= windowStart && totalMinutes <= endMins;
}

/**
 * Formats a user's shift hours as a display string.
 * Falls back to the default hours if either value is missing.
 */
export function formatShiftHours(shiftStartTime?: string, shiftEndTime?: string): string {
  const start = shiftStartTime || DEFAULT_SHIFT_START;
  const end   = shiftEndTime   || DEFAULT_SHIFT_END;
  return `${start} – ${end}`;
}

export { formatShiftHours as formatShiftPeriod };
