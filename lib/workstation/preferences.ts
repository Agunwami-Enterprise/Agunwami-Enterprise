'use client';

// ─── Workstation preferences ──────────────────────────────────────────────────
// Settings → Preferences. The start page is saved to the person's account
// (users/{uid}/settings/workstation in the workstation Firebase project) so it
// applies on any device; "reduce animations" is a per-device choice kept in this
// browser, like the theme.

import { useSyncExternalStore } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { authDb } from './firebase';

// ── Start page ───────────────────────────────────────────────────────────────

export const DEFAULT_START_PAGE = '/ceo/dashboard';

export const START_PAGES: Array<{ value: string; label: string }> = [
  { value: '/ceo/dashboard', label: 'Overview' },
  { value: '/ceo/tasks', label: 'Tasks' },
  { value: '/ceo/messages', label: 'Messages' },
  { value: '/ceo/time-tracking', label: 'Time Tracking' },
  { value: '/ceo/documents', label: 'Documents' },
  { value: '/ceo/analytics', label: 'Analytics' },
  { value: '/ceo/leave-requests', label: 'Leave Requests' },
  { value: '/ceo/staff', label: 'Staff Management' },
  { value: '/ceo/payments', label: 'Payments' },
  { value: '/ceo/notifications', label: 'Notifications' },
  { value: '/ceo/training', label: 'Training' },
];

const isStartPage = (value: unknown): value is string =>
  typeof value === 'string' && START_PAGES.some(page => page.value === value);

const workstationDoc = (uid: string) => doc(authDb, 'users', uid, 'settings', 'workstation');

export async function getStartPage(uid: string): Promise<string> {
  try {
    const snap = await getDoc(workstationDoc(uid));
    const value = snap.exists() ? snap.data().startPage : null;
    return isStartPage(value) ? value : DEFAULT_START_PAGE;
  } catch {
    return DEFAULT_START_PAGE;
  }
}

export async function saveStartPage(uid: string, startPage: string): Promise<void> {
  if (!isStartPage(startPage)) throw new Error('Choose a page from the list.');
  await setDoc(workstationDoc(uid), { startPage, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Where to go after signing in: the person's start page when the server sends
 * them to the workstation dashboard; any other destination (e.g. the C-panel
 * for website editors) is kept.
 */
export async function resolveHome(serverHome: unknown, uid: string | undefined): Promise<string> {
  const home = typeof serverHome === 'string' ? serverHome : DEFAULT_START_PAGE;
  if (home !== DEFAULT_START_PAGE || !uid) return home;
  return getStartPage(uid);
}

// ── Reduce animations (this device) ──────────────────────────────────────────

const MOTION_KEY = 'ae_reduce_motion';
const MOTION_EVENT = 'ae-reduce-motion-change';
export const REDUCE_MOTION_CLASS = 'ae-reduce-motion';

function readReduceMotion(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Adds or removes the class that turns the workstation's animations off. */
export function applyReduceMotion(on = readReduceMotion()): void {
  document.documentElement.classList.toggle(REDUCE_MOTION_CLASS, on);
}

export function setReduceMotion(on: boolean): void {
  try {
    if (on) localStorage.setItem(MOTION_KEY, '1');
    else localStorage.removeItem(MOTION_KEY);
  } catch { /* storage unavailable: applies to this visit only */ }
  applyReduceMotion(on);
  window.dispatchEvent(new Event(MOTION_EVENT));
}

function subscribeReduceMotion(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === MOTION_KEY) { applyReduceMotion(); onChange(); }
  };
  window.addEventListener(MOTION_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(MOTION_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** The saved choice, kept in sync across components and browser tabs. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribeReduceMotion, readReduceMotion, () => false);
}

// ── Time zones ───────────────────────────────────────────────────────────────

/** Every IANA time zone the browser knows, or null if it can't list them. */
export function allTimeZones(): string[] | null {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone');
    return list && list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** "GMT+1" for a time zone at the given moment. */
export function utcOffsetLabel(timeZone: string, at = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find(p => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return '';
  }
}

/** "Africa/Lagos" → "Lagos", "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function cityName(timeZone: string): string {
  return (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
}
