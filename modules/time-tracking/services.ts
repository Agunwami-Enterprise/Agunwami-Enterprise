import {
  doc, getDoc, setDoc, onSnapshot, collection, runTransaction,
  Timestamp, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/workstation/firebase';
import type {
  TimeTrackingDayDoc, MonthlySummaryDoc, TimeTrackingLiveDoc, DayStatus, TimeSession,
} from './types';

export function todayId(d = new Date()): string {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
}

export function monthId(d = new Date()): string {
  return todayId(d).slice(0, 7); // YYYY-MM
}

export interface StaffLiveInfo { name: string; role: string; department: string; }

const dayRef  = (uid: string, dateId: string) => doc(db, 'timeTracking', uid, 'days', dateId);
const liveRef = (uid: string) => doc(db, 'timeTrackingLive', uid);

export function subscribeToday(uid: string, cb: (day: TimeTrackingDayDoc | null) => void): () => void {
  if (!uid || !db) { cb(null); return () => {}; }
  return onSnapshot(
    dayRef(uid, todayId()),
    snap => cb(snap.exists() ? (snap.data() as TimeTrackingDayDoc) : null),
    err => console.warn('subscribeToday snapshot error:', err)
  );
}

export function subscribeMonthlySummary(
  uid: string, month: string, cb: (summary: MonthlySummaryDoc | null) => void,
): () => void {
  if (!uid || !db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, 'timeTracking', uid, 'monthlySummary', month),
    snap => cb(snap.exists() ? (snap.data() as MonthlySummaryDoc) : null),
    err => console.warn('subscribeMonthlySummary snapshot error:', err)
  );
}

export async function getDay(uid: string, dateId: string): Promise<TimeTrackingDayDoc | null> {
  const snap = await getDoc(dayRef(uid, dateId));
  return snap.exists() ? (snap.data() as TimeTrackingDayDoc) : null;
}

export function subscribeLiveTeam(
  cb: (rows: Array<TimeTrackingLiveDoc & { uid: string }>) => void,
): () => void {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    collection(db, 'timeTrackingLive'),
    snap => {
      cb(snap.docs.map(d => ({ uid: d.id, ...(d.data() as TimeTrackingLiveDoc) })));
    },
    err => console.warn('subscribeLiveTeam snapshot error:', err)
  );
}

async function syncLive(
  uid: string, info: StaffLiveInfo, status: DayStatus, todayClockIn?: Timestamp,
): Promise<void> {
  const payload: Record<string, unknown> = {
    name: info.name, role: info.role, department: info.department,
    status, lastUpdated: serverTimestamp(),
  };
  if (todayClockIn !== undefined) payload.todayClockIn = todayClockIn;
  await setDoc(liveRef(uid), payload, { merge: true });
}

export function computeLiveTotals(
  sessions: TimeSession[] | undefined, now: number,
): { workedMinutes: number; breakMinutes: number } {
  let workedMs = 0, breakMs = 0;
  for (const s of sessions ?? []) {
    const endMs = s.end ? s.end.toMillis() : now;
    const ms = endMs - s.start.toMillis();
    if (s.type === 'work') workedMs += ms; else breakMs += ms;
  }
  return { workedMinutes: Math.floor(workedMs / 60000), breakMinutes: Math.floor(breakMs / 60000) };
}

function closeLastSession(sessions: TimeSession[], end: Timestamp): TimeSession[] {
  if (sessions.length === 0) return sessions;
  const copy = [...sessions];
  copy[copy.length - 1] = { ...copy[copy.length - 1], end };
  return copy;
}

export async function clockIn(uid: string, info: StaffLiveInfo): Promise<void> {
  const now = Timestamp.now();
  const dayDoc: TimeTrackingDayDoc = {
    date: todayId(), clockIn: now, clockOut: null, status: 'active',
    totalWorkedMinutes: 0, totalBreakMinutes: 0,
    sessions: [{ type: 'work', start: now, end: null }],
  };
  await setDoc(dayRef(uid, todayId()), dayDoc);
  await syncLive(uid, info, 'active', now);
}

export async function startBreak(uid: string, info: StaffLiveInfo): Promise<void> {
  const now = Timestamp.now();
  const ref = dayRef(uid, todayId());
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as TimeTrackingDayDoc;
    const sessions = closeLastSession(data.sessions, now);
    sessions.push({ type: 'break', start: now, end: null });
    tx.update(ref, { sessions, status: 'break' });
  });
  await syncLive(uid, info, 'break');
}

export async function resumeWork(uid: string, info: StaffLiveInfo): Promise<void> {
  const now = Timestamp.now();
  const ref = dayRef(uid, todayId());
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as TimeTrackingDayDoc;
    const sessions = closeLastSession(data.sessions, now);
    sessions.push({ type: 'work', start: now, end: null });
    tx.update(ref, { sessions, status: 'active' });
  });
  await syncLive(uid, info, 'active');
}

export async function clockOut(uid: string, info: StaffLiveInfo): Promise<void> {
  const now = Timestamp.now();
  const ref = dayRef(uid, todayId());
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as TimeTrackingDayDoc;
    const sessions = closeLastSession(data.sessions, now);
    let workedMs = 0, breakMs = 0;
    for (const s of sessions) {
      const end = s.end ?? now;
      const ms = end.toMillis() - s.start.toMillis();
      if (s.type === 'work') workedMs += ms; else breakMs += ms;
    }
    tx.update(ref, {
      sessions, clockOut: now, status: 'clocked-out',
      totalWorkedMinutes: Math.round(workedMs / 60000),
      totalBreakMinutes: Math.round(breakMs / 60000),
    });
  });
  await syncLive(uid, info, 'clocked-out');
}
