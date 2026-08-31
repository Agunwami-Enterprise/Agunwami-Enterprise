"use strict";
// ─── Time Utilities ───────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.todayId = todayId;
exports.monthId = monthId;
exports.fmtDate = fmtDate;
exports.relativeTime = relativeTime;
exports.fmtDuration = fmtDuration;
/** Returns today's date as a YYYY-MM-DD string in local time */
function todayId(d = new Date()) {
    return d.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
}
/** Returns the current month as a YYYY-MM string in local time */
function monthId(d = new Date()) {
    return todayId(d).slice(0, 7);
}
/**
 * Converts a Firestore Timestamp-like value, a string, or a number to
 * a YYYY-MM-DD string. Safe against null / undefined.
 */
function fmtDate(ts) {
    if (!ts)
        return new Date().toISOString().split('T')[0];
    if (typeof ts === 'string')
        return ts;
    if (ts.toDate)
        return ts.toDate().toISOString().split('T')[0];
    return new Date(ts).toISOString().split('T')[0];
}
/**
 * Returns a human-readable relative time string.
 * @param ts  A Firestore Timestamp-like value with a `toDate()` method.
 */
function relativeTime(ts) {
    const diff = Date.now() - ts.toDate().getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60)
        return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24)
        return `${hr} hour${hr > 1 ? 's' : ''} ago`;
    const day = Math.floor(hr / 24);
    return `${day} day${day > 1 ? 's' : ''} ago`;
}
/**
 * Formats a duration in minutes to a "HH:MM" string.
 * @example fmtDuration(90) → "1:30"
 */
function fmtDuration(minutes) {
    if (!minutes || minutes < 0)
        return '0:00';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
}
