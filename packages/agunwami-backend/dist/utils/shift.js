"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTimeToMinutes = parseTimeToMinutes;
exports.getShiftStartMins = getShiftStartMins;
exports.getShiftEndMins = getShiftEndMins;
exports.isWithinShiftWindow = isWithinShiftWindow;
exports.formatShiftHours = formatShiftHours;
exports.formatShiftPeriod = formatShiftHours;
// ─── Shift Utilities ──────────────────────────────────────────────────────────
const shift_1 = require("../constants/shift");
/**
 * Parses a "HH:mm" shift time string into total minutes from midnight.
 * Falls back to `defaultMins` if the string is missing or malformed.
 *
 * @example parseTimeToMinutes("09:00", 540) → 540
 * @example parseTimeToMinutes("17:30", 1020) → 1050
 */
function parseTimeToMinutes(timeStr, defaultMins) {
    if (!timeStr)
        return defaultMins;
    const parts = timeStr.split(':');
    if (parts.length < 2)
        return defaultMins;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return isNaN(h) || isNaN(m) ? defaultMins : h * 60 + m;
}
/**
 * Returns the shift start time in minutes from midnight for a given user,
 * defaulting to DEFAULT_SHIFT_START (09:00 → 540 mins) if unassigned.
 */
function getShiftStartMins(shiftStartTime) {
    const defaultMins = parseTimeToMinutes(shift_1.DEFAULT_SHIFT_START, 9 * 60);
    return parseTimeToMinutes(shiftStartTime, defaultMins);
}
/**
 * Returns the shift end time in minutes from midnight for a given user,
 * defaulting to DEFAULT_SHIFT_END (17:00 → 1020 mins) if unassigned.
 */
function getShiftEndMins(shiftEndTime) {
    const defaultMins = parseTimeToMinutes(shift_1.DEFAULT_SHIFT_END, 17 * 60);
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
function isWithinShiftWindow(now, shiftStartTime, shiftEndTime) {
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    const startMins = getShiftStartMins(shiftStartTime);
    const endMins = getShiftEndMins(shiftEndTime);
    const windowStart = Math.max(0, startMins - 2); // 2 min grace period
    return totalMinutes >= windowStart && totalMinutes <= endMins;
}
/**
 * Formats a user's shift hours as a display string.
 * Falls back to the default hours if either value is missing.
 */
function formatShiftHours(shiftStartTime, shiftEndTime) {
    const start = shiftStartTime || shift_1.DEFAULT_SHIFT_START;
    const end = shiftEndTime || shift_1.DEFAULT_SHIFT_END;
    return `${start} – ${end}`;
}
