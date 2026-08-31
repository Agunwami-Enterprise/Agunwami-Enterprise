/**
 * Parses a "HH:mm" shift time string into total minutes from midnight.
 * Falls back to `defaultMins` if the string is missing or malformed.
 *
 * @example parseTimeToMinutes("09:00", 540) → 540
 * @example parseTimeToMinutes("17:30", 1020) → 1050
 */
export declare function parseTimeToMinutes(timeStr: string | undefined, defaultMins: number): number;
/**
 * Returns the shift start time in minutes from midnight for a given user,
 * defaulting to DEFAULT_SHIFT_START (09:00 → 540 mins) if unassigned.
 */
export declare function getShiftStartMins(shiftStartTime?: string): number;
/**
 * Returns the shift end time in minutes from midnight for a given user,
 * defaulting to DEFAULT_SHIFT_END (17:00 → 1020 mins) if unassigned.
 */
export declare function getShiftEndMins(shiftEndTime?: string): number;
/**
 * Checks whether the current time falls within the user's shift window.
 * Applies a 2-minute grace period before the shift start time.
 *
 * @param now           Current time as a Date object
 * @param shiftStartTime  User's assigned shift start, e.g. "09:00"
 * @param shiftEndTime    User's assigned shift end, e.g. "17:00"
 */
export declare function isWithinShiftWindow(now: Date, shiftStartTime?: string, shiftEndTime?: string): boolean;
/**
 * Formats a user's shift hours as a display string.
 * Falls back to the default hours if either value is missing.
 */
export declare function formatShiftHours(shiftStartTime?: string, shiftEndTime?: string): string;
export { formatShiftHours as formatShiftPeriod };
