// ─── Time Tracking Services ───────────────────────────────────────────────────
// All clock-in / clock-out / break operations for staff members.
// Writes to: /timeTracking/{uid}/days/{YYYY-MM-DD} and /timeTrackingLive/{uid}

import {
  doc, getDoc, setDoc, onSnapshot, collection, runTransaction,
  Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { getDb } from './firebase-instance';
import { todayId, monthId } from '../utils/time';
import type {
  TimeTrackingDayDoc, MonthlySummaryDoc, TimeTrackingLiveDoc,
  DayStatus, TimeSession, StaffLiveInfo,
} from '../types/time-tracking';

export { todayId, monthId };

// ── Collection refs ──────────────────────────────────────────────────────────

function dayRef(uid: string, dateId: string) {
  return doc(getDb(), 'timeTracking', uid, 'days', dateId);
}

function liveRef(uid: string) {
  return doc(getDb(), 'timeTrackingLive', uid);
}

// ── Real-time subscriptions ──────────────────────────────────────────────────

/** Subscribe to today's time-tracking document for a user. */
export function subscribeToday(
  uid: string,
  cb: (day: TimeTrackingDayDoc | null) => void,
): () => void {
  if (!uid) { cb(null); return () => {}; }
  return onSnapshot(
    dayRef(uid, todayId()),
    (snap: any) => cb(snap.exists() ? (snap.data() as TimeTrackingDayDoc) : null),
    (err: any) => console.warn('[agunwami-backend] subscribeToday error:', err),
  );
}

/** Subscribe to a user's monthly summary document. */
export function subscribeMonthlySummary(
  uid:   string,
  month: string,
  cb:    (summary: MonthlySummaryDoc | null) => void,
): () => void {
  if (!uid) { cb(null); return () => {}; }
  return onSnapshot(
    doc(getDb(), 'timeTracking', uid, 'monthlySummary', month),
    (snap: any) => cb(snap.exists() ? (snap.data() as MonthlySummaryDoc) : null),
    (err: any) => console.warn('[agunwami-backend] subscribeMonthlySummary error:', err),
  );
}

/** Subscribe to the live team presence collection. */
export function subscribeLiveTeam(
  cb: (rows: Array<TimeTrackingLiveDoc & { uid: string }>) => void,
): () => void {
  return onSnapshot(
    collection(getDb(), 'timeTrackingLive'),
    (snap: any) => cb(snap.docs.map((d: any) => ({ uid: d.id, ...(d.data() as TimeTrackingLiveDoc) }))),
    (err: any) => console.warn('[agunwami-backend] subscribeLiveTeam error:', err),
  );
}

/** Fetch a specific day document (one-time read). */
export async function getDay(
  uid:    string,
  dateId: string,
): Promise<TimeTrackingDayDoc | null> {
  const snap = await getDoc(dayRef(uid, dateId));
  return snap.exists() ? (snap.data() as TimeTrackingDayDoc) : null;
}

// ── Live totals helper ────────────────────────────────────────────────────────

/**
 * Computes worked and break minutes from a session array.
 * Uses `now` (epoch ms) for any session that hasn't ended yet.
 */
export function computeLiveTotals(
  sessions: TimeSession[] | undefined,
  now:      number,
): { workedMinutes: number; breakMinutes: number } {
  let workedMs = 0, breakMs = 0;
  for (const s of sessions ?? []) {
    const endMs = s.end ? s.end.toMillis() : now;
    const ms    = endMs - s.start.toMillis();
    if (s.type === 'work') workedMs += ms; else breakMs += ms;
  }
  return {
    workedMinutes: Math.floor(workedMs / 60_000),
    breakMinutes:  Math.floor(breakMs  / 60_000),
  };
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function syncLive(
  uid:          string,
  info:         StaffLiveInfo,
  status:       DayStatus,
  todayClockIn?: Timestamp,
): Promise<void> {
  const payload: Record<string, unknown> = {
    name: info.name, role: info.role, department: info.department,
    status, lastUpdated: serverTimestamp(),
  };
  if (todayClockIn !== undefined) payload.todayClockIn = todayClockIn;
  await setDoc(liveRef(uid), payload, { merge: true });
}

function closeLastSession(sessions: TimeSession[], end: Timestamp): TimeSession[] {
  if (sessions.length === 0) return sessions;
  const copy = [...sessions];
  copy[copy.length - 1] = { ...copy[copy.length - 1], end };
  return copy;
}

// ── Clock actions ─────────────────────────────────────────────────────────────

/** Clock a staff member in for today. Creates a new day document. */
export async function clockIn(uid: string, info: StaffLiveInfo): Promise<void> {
  const now = Timestamp.now();
  const dayDoc: TimeTrackingDayDoc = {
    date: todayId(), clockIn: now, clockOut: null, status: 'onshift',
    totalWorkedMinutes: 0, totalBreakMinutes: 0,
    sessions: [{ type: 'work', start: now, end: null }],
  };
  await setDoc(dayRef(uid, todayId()), dayDoc);
  await syncLive(uid, info, 'onshift', now);
}

/** Start a break session. */
export async function startBreak(uid: string, info: StaffLiveInfo): Promise<void> {
  const now = Timestamp.now();
  const ref = dayRef(uid, todayId());
  await runTransaction(getDb(), async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data     = snap.data() as TimeTrackingDayDoc;
    const sessions = closeLastSession(data.sessions, now);
    sessions.push({ type: 'break', start: now, end: null });
    tx.update(ref, { sessions, status: 'onbreak' });
  });
  await syncLive(uid, info, 'onbreak');
}

/** End a break and resume work. */
export async function resumeWork(uid: string, info: StaffLiveInfo): Promise<void> {
  const now = Timestamp.now();
  const ref = dayRef(uid, todayId());
  await runTransaction(getDb(), async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data     = snap.data() as TimeTrackingDayDoc;
    const sessions = closeLastSession(data.sessions, now);
    sessions.push({ type: 'work', start: now, end: null });
    tx.update(ref, { sessions, status: 'onshift' });
  });
  await syncLive(uid, info, 'onshift');
}

/** Clock a staff member out for today. Calculates totals from sessions. */
export async function clockOut(uid: string, info: StaffLiveInfo): Promise<void> {
  const now = Timestamp.now();
  const ref = dayRef(uid, todayId());
  await runTransaction(getDb(), async (tx: any) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data     = snap.data() as TimeTrackingDayDoc;
    const sessions = closeLastSession(data.sessions, now);

    let workedMs = 0, breakMs = 0;
    for (const s of sessions) {
      const end = s.end ?? now;
      const ms  = end.toMillis() - s.start.toMillis();
      if (s.type === 'work') workedMs += ms; else breakMs += ms;
    }
    tx.update(ref, {
      sessions, clockOut: now, status: 'offshift',
      totalWorkedMinutes: Math.round(workedMs / 60_000),
      totalBreakMinutes:  Math.round(breakMs  / 60_000),
    });
  });
  await syncLive(uid, info, 'offshift');
}
