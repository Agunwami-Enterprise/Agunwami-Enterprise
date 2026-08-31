/** Returns today's date as a YYYY-MM-DD string in local time */
export declare function todayId(d?: Date): string;
/** Returns the current month as a YYYY-MM string in local time */
export declare function monthId(d?: Date): string;
/**
 * Converts a Firestore Timestamp-like value, a string, or a number to
 * a YYYY-MM-DD string. Safe against null / undefined.
 */
export declare function fmtDate(ts: any): string;
/**
 * Returns a human-readable relative time string.
 * @param ts  A Firestore Timestamp-like value with a `toDate()` method.
 */
export declare function relativeTime(ts: {
    toDate(): Date;
}): string;
/**
 * Formats a duration in minutes to a "HH:MM" string.
 * @example fmtDuration(90) → "1:30"
 */
export declare function fmtDuration(minutes: number): string;
