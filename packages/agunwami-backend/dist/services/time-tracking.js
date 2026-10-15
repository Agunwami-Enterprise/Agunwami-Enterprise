"use strict";
// ─── Time Tracking Services ───────────────────────────────────────────────────
// All clock-in / clock-out / break operations for staff members.
// Writes to: /timeTracking/{uid}/days/{YYYY-MM-DD} and /timeTrackingLive/{uid}
// Every function takes an optional `db` for apps whose clock-in data lives in
// a different Firebase project than the business data.
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthId = exports.todayId = void 0;
exports.subscribeToday = subscribeToday;
exports.subscribeMonthlySummary = subscribeMonthlySummary;
exports.subscribeLiveTeam = subscribeLiveTeam;
exports.getDay = getDay;
exports.computeLiveTotals = computeLiveTotals;
exports.clockIn = clockIn;
exports.startBreak = startBreak;
exports.resumeWork = resumeWork;
exports.clockOut = clockOut;
const firestore_1 = require("firebase/firestore");
const firebase_instance_1 = require("./firebase-instance");
const time_1 = require("../utils/time");
Object.defineProperty(exports, "todayId", { enumerable: true, get: function () { return time_1.todayId; } });
Object.defineProperty(exports, "monthId", { enumerable: true, get: function () { return time_1.monthId; } });
// ── Collection refs ──────────────────────────────────────────────────────────
function dayRef(db, uid, dateId) {
    return (0, firestore_1.doc)(db, 'timeTracking', uid, 'days', dateId);
}
function liveRef(db, uid) {
    return (0, firestore_1.doc)(db, 'timeTrackingLive', uid);
}
// ── Real-time subscriptions ──────────────────────────────────────────────────
// On a read error each subscription calls back with an empty result (so
// callers stop loading) and passes the error to `onError`.
/** Subscribe to today's time-tracking document for a user. */
function subscribeToday(uid, cb, db = (0, firebase_instance_1.getDb)(), onError) {
    if (!uid) {
        cb(null);
        return () => { };
    }
    return (0, firestore_1.onSnapshot)(dayRef(db, uid, (0, time_1.todayId)()), (snap) => cb(snap.exists() ? snap.data() : null), (err) => { console.warn('[agunwami-backend] subscribeToday error:', err); cb(null); onError?.(err); });
}
/** Subscribe to a user's monthly summary document. */
function subscribeMonthlySummary(uid, month, cb, db = (0, firebase_instance_1.getDb)(), onError) {
    if (!uid) {
        cb(null);
        return () => { };
    }
    return (0, firestore_1.onSnapshot)((0, firestore_1.doc)(db, 'timeTracking', uid, 'monthlySummary', month), (snap) => cb(snap.exists() ? snap.data() : null), (err) => { console.warn('[agunwami-backend] subscribeMonthlySummary error:', err); cb(null); onError?.(err); });
}
/** Subscribe to the live team presence collection. */
function subscribeLiveTeam(cb, db = (0, firebase_instance_1.getDb)(), onError) {
    return (0, firestore_1.onSnapshot)((0, firestore_1.collection)(db, 'timeTrackingLive'), (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))), (err) => { console.warn('[agunwami-backend] subscribeLiveTeam error:', err); cb([]); onError?.(err); });
}
/** Fetch a specific day document (one-time read). */
async function getDay(uid, dateId, db = (0, firebase_instance_1.getDb)()) {
    const snap = await (0, firestore_1.getDoc)(dayRef(db, uid, dateId));
    return snap.exists() ? snap.data() : null;
}
// ── Live totals helper ────────────────────────────────────────────────────────
/**
 * Computes worked and break minutes from a session array.
 * Uses `now` (epoch ms) for any session that hasn't ended yet.
 */
function computeLiveTotals(sessions, now) {
    let workedMs = 0, breakMs = 0;
    for (const s of sessions ?? []) {
        const endMs = s.end ? s.end.toMillis() : now;
        const ms = endMs - s.start.toMillis();
        if (s.type === 'work')
            workedMs += ms;
        else
            breakMs += ms;
    }
    return {
        workedMinutes: Math.floor(workedMs / 60000),
        breakMinutes: Math.floor(breakMs / 60000),
    };
}
// ── Internal helpers ─────────────────────────────────────────────────────────
async function syncLive(db, uid, info, status, todayClockIn) {
    const payload = {
        name: info.name, role: info.role, department: info.department,
        status, lastUpdated: (0, firestore_1.serverTimestamp)(),
    };
    if (todayClockIn !== undefined)
        payload.todayClockIn = todayClockIn;
    await (0, firestore_1.setDoc)(liveRef(db, uid), payload, { merge: true });
    // Keep users/{uid} in sync for aehub and workstation compatibility
    try {
        const userStatusMap = {
            onshift: 'Clocked In',
            onbreak: 'On Break',
            offshift: 'Clocked Out',
            onleave: 'On Leave',
            suspended: 'Suspended',
        };
        const userPayload = {
            status: userStatusMap[status] || 'Clocked Out',
            lastActiveTime: Date.now(),
        };
        if (todayClockIn !== undefined) {
            userPayload.clockInTime = todayClockIn.toMillis();
        }
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, 'users', uid), userPayload, { merge: true });
    }
    catch (e) {
        console.warn('[agunwami-backend] syncLive users error:', e);
    }
}
function closeLastSession(sessions, end) {
    if (sessions.length === 0)
        return sessions;
    const copy = [...sessions];
    copy[copy.length - 1] = { ...copy[copy.length - 1], end };
    return copy;
}
// ── Clock actions ─────────────────────────────────────────────────────────────
/** Clock a staff member in for today. Creates a new day document. */
async function clockIn(uid, info, db = (0, firebase_instance_1.getDb)()) {
    const now = firestore_1.Timestamp.now();
    const dayDoc = {
        date: (0, time_1.todayId)(), clockIn: now, clockOut: null, status: 'onshift',
        totalWorkedMinutes: 0, totalBreakMinutes: 0,
        sessions: [{ type: 'work', start: now, end: null }],
    };
    await (0, firestore_1.setDoc)(dayRef(db, uid, (0, time_1.todayId)()), dayDoc);
    await syncLive(db, uid, info, 'onshift', now);
}
/** Start a break session. */
async function startBreak(uid, info, db = (0, firebase_instance_1.getDb)()) {
    const now = firestore_1.Timestamp.now();
    const ref = dayRef(db, uid, (0, time_1.todayId)());
    await (0, firestore_1.runTransaction)(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists())
            return;
        const data = snap.data();
        const sessions = closeLastSession(data.sessions, now);
        sessions.push({ type: 'break', start: now, end: null });
        tx.update(ref, { sessions, status: 'onbreak' });
    });
    await syncLive(db, uid, info, 'onbreak');
}
/** End a break and resume work. */
async function resumeWork(uid, info, db = (0, firebase_instance_1.getDb)()) {
    const now = firestore_1.Timestamp.now();
    const ref = dayRef(db, uid, (0, time_1.todayId)());
    await (0, firestore_1.runTransaction)(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists())
            return;
        const data = snap.data();
        const sessions = closeLastSession(data.sessions, now);
        sessions.push({ type: 'work', start: now, end: null });
        tx.update(ref, { sessions, status: 'onshift' });
    });
    await syncLive(db, uid, info, 'onshift');
}
/** Clock a staff member out for today. Calculates totals from sessions. */
async function clockOut(uid, info, db = (0, firebase_instance_1.getDb)()) {
    const now = firestore_1.Timestamp.now();
    const ref = dayRef(db, uid, (0, time_1.todayId)());
    await (0, firestore_1.runTransaction)(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists())
            return;
        const data = snap.data();
        const sessions = closeLastSession(data.sessions, now);
        let workedMs = 0, breakMs = 0;
        for (const s of sessions) {
            const end = s.end ?? now;
            const ms = end.toMillis() - s.start.toMillis();
            if (s.type === 'work')
                workedMs += ms;
            else
                breakMs += ms;
        }
        tx.update(ref, {
            sessions, clockOut: now, status: 'offshift',
            totalWorkedMinutes: Math.round(workedMs / 60000),
            totalBreakMinutes: Math.round(breakMs / 60000),
        });
    });
    await syncLive(db, uid, info, 'offshift');
}
