// ─── Settings / User Profile ──────────────────────────────────────────────────
// Profiles and per-person settings live in the workstation (AE Hub) Firebase
// project, where staff and the CEO are signed in. Everything here reads and
// writes the same fields AE Hub's staff settings page uses, so a change made in
// either app shows up in both.

import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { subscribeUserProfile as subscribeUserProfileIn, type UserProfile } from 'agunwami-backend';
import { auth, authDb, storage } from '@/lib/workstation/firebase';

export type { AccountStatus, ShiftStatus, UserProfile } from 'agunwami-backend';

export function subscribeUserProfile(
  uid: string,
  cb: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return subscribeUserProfileIn(uid, cb, authDb, onError);
}

// ── Profile ──────────────────────────────────────────────────────────────────

export interface ProfileUpdate {
  displayName: string;
  phone: string;
  location: string;
  bio: string;
}

export const PROFILE_LIMITS = { displayName: 80, phone: 30, location: 80, bio: 600 } as const;

/** Saves the editable profile fields (role, department and IDs are not editable here). */
export async function saveProfile(uid: string, update: ProfileUpdate): Promise<void> {
  const displayName = update.displayName.trim();
  if (!displayName) throw new Error('Enter your full name.');
  await updateDoc(doc(authDb, 'users', uid), {
    displayName: displayName.slice(0, PROFILE_LIMITS.displayName),
    phone: update.phone.trim().slice(0, PROFILE_LIMITS.phone),
    location: update.location.trim().slice(0, PROFILE_LIMITS.location),
    bio: update.bio.trim().slice(0, PROFILE_LIMITS.bio),
  });
  if (auth.currentUser?.uid === uid) {
    await updateProfile(auth.currentUser, { displayName }).catch(() => undefined);
  }
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Uploads a profile photo to users/{uid}/profile/ (as AE Hub does) and saves its URL. */
export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPG, PNG or WebP).');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('The photo must be 2 MB or smaller.');
  const snapshot = await uploadBytes(ref(storage, `users/${uid}/profile/avatar_${Date.now()}`), file, {
    contentType: file.type,
  });
  const photoURL = await getDownloadURL(snapshot.ref);
  await updateDoc(doc(authDb, 'users', uid), { photoURL });
  if (auth.currentUser?.uid === uid) {
    await updateProfile(auth.currentUser, { photoURL }).catch(() => undefined);
  }
  return photoURL;
}

// ── Time zone ────────────────────────────────────────────────────────────────

export const TIME_ZONES: Array<{ value: string; label: string }> = [
  { value: 'Africa/Lagos', label: 'West Africa Time (Lagos)' },
  { value: 'UTC', label: 'GMT / UTC' },
  { value: 'Europe/London', label: 'UK Time (London)' },
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
];

/**
 * Saves the time zone on the profile (AE Hub's attendance reports read
 * `timeZone` to judge lateness) and in AE Hub's platform settings.
 */
export async function saveTimeZone(uid: string, timeZone: string): Promise<void> {
  await updateDoc(doc(authDb, 'users', uid), { timeZone });
  await setDoc(doc(authDb, 'users', uid, 'settings', 'platform'), { timezone: timeZone, updatedAt: new Date().toISOString() }, { merge: true });
}

// ── Security ─────────────────────────────────────────────────────────────────

/** Emails a secure link for choosing a new password (Firebase Auth). */
export function sendPasswordReset(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
}

/** AE Hub's 2FA status (users/{uid}/settings/security), enforced at AE Hub sign-in. */
export function subscribeSecuritySettings(
  uid: string,
  cb: (settings: SecuritySettings) => void,
): () => void {
  return onSnapshot(
    doc(authDb, 'users', uid, 'settings', 'security'),
    snap => cb({
      twoFactorEnabled: snap.exists() && snap.data().twoFactorEnabled === true,
      twoFactorMethod: (snap.exists() && typeof snap.data().twoFactorMethod === 'string') ? snap.data().twoFactorMethod : null,
    }),
    error => {
      console.warn('[settings] Security settings snapshot error:', error);
      cb({ twoFactorEnabled: false, twoFactorMethod: null });
    },
  );
}

// ── In-app notification preferences ──────────────────────────────────────────

export type NotificationCategory = 'tasks' | 'updates' | 'payments' | 'messages';

export const NOTIFICATION_CATEGORIES: Array<{ key: NotificationCategory; label: string; desc: string }> = [
  { key: 'tasks', label: 'Tasks & leave', desc: 'Task assignments, reviews and leave requests' },
  { key: 'updates', label: 'Updates & announcements', desc: 'Announcements, staff changes and project updates' },
  { key: 'payments', label: 'Payments', desc: 'Salary, stipend and payment status changes' },
  { key: 'messages', label: 'Messages', desc: 'New messages and support conversations' },
];

export type InAppPreferences = Record<NotificationCategory, boolean>;

export const DEFAULT_IN_APP: InAppPreferences = { tasks: true, updates: true, payments: true, messages: true };

/** Which notification categories show in the bell and on the Notifications page. */
export function subscribeInAppPreferences(
  uid: string,
  cb: (prefs: InAppPreferences) => void,
): () => void {
  return onSnapshot(
    doc(authDb, 'users', uid, 'settings', 'workstation'),
    snap => {
      const saved = (snap.exists() ? snap.data().inAppNotifications : null) as Partial<InAppPreferences> | null;
      cb({ ...DEFAULT_IN_APP, ...(saved ?? {}) });
    },
    error => {
      console.warn('[settings] Notification preferences snapshot error:', error);
      cb(DEFAULT_IN_APP);
    },
  );
}

export async function saveInAppPreference(uid: string, category: NotificationCategory, enabled: boolean): Promise<void> {
  await setDoc(
    doc(authDb, 'users', uid, 'settings', 'workstation'),
    { inAppNotifications: { [category]: enabled }, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}
