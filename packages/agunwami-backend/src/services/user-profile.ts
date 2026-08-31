// ─── User Profile Service ─────────────────────────────────────────────────────
// Real-time subscription to a user's profile document in Firestore.
// Maps the raw `users/{uid}` document to the canonical UserProfile shape.

import { doc, onSnapshot } from 'firebase/firestore';
import { getDb } from './firebase-instance';
import type { UserProfile, AccountStatus, ShiftStatus, UserRole } from '../types/user';
import { getStaffDisplayName, getStaffAvatar, getStaffPhone, getStaffPosition, getStaffPermissions } from '../types/user';
import { DEFAULT_SHIFT_START, DEFAULT_SHIFT_END } from '../constants/shift';

/**
 * Subscribes to the user's Firestore profile in real time.
 * Calls `cb` immediately and on every update.
 * Returns an unsubscribe function.
 */
export function subscribeUserProfile(
  uid: string,
  cb: (profile: UserProfile | null) => void,
): () => void {
  if (!uid) { cb(null); return () => {}; }

  const db = getDb();
  return onSnapshot(
    doc(db, 'users', uid),
    (snap: any) => {
      if (!snap.exists()) { cb(null); return; }
      const d = snap.data();

      // System role is strictly 'student' | 'staff'
      const role: UserRole = (d.role === 'student' ? 'student' : 'staff');

      cb({
        // ── Identity ──────────────────────────────────────────────────────────
        uid,
        email:         (d.email as string)                               ?? null,
        displayName:   getStaffDisplayName(d),
        photoURL:      getStaffAvatar(d)                                 ?? null,
        phone:         getStaffPhone(d)                                  ?? null,
        role,
        createdAt:     (d.createdAt as number)                           ?? 0,

        // ── Profile ───────────────────────────────────────────────────────────
        country:        (d.country as string)                            ?? null,
        bio:            (d.bio as string)                                ?? null,
        workExperience: (d.workExperience as string)                     ?? null,
        education:      (d.education as string)                          ?? null,
        skills:         (d.skills as string[])                           ?? [],
        certificates:   (d.certificates as string[])                     ?? [],
        location:       d.location                                       as string | undefined,
        joinDate:       d.joinDate
          ? (typeof d.joinDate === 'string'
              ? d.joinDate
              : (d.joinDate.toDate ? d.joinDate.toDate().toISOString().split('T')[0] : undefined))
          : undefined,

        // ── Staff / department ────────────────────────────────────────────────
        department:            (d.department as string)                  ?? null,
        departmentPosition:    getStaffPosition(d),
        departmentPermissions: getStaffPermissions(d),
        isDepartmentAdmin:     (d.isDepartmentAdmin as boolean)          ?? undefined,
        aehubId:               (d.aehubId as string)                     ?? null,
        staffNumber:           (d.staffNumber as number)                 ?? null,
        lastActiveTime:        (d.lastActiveTime as number)              ?? undefined,
        attendedDates:         (d.attendedDates as string[])             ?? undefined,

        // ── Gamification (aehub student features — unused by ae-ws) ───────────
        xp:               d.xp              as number  | undefined,
        medals:           d.medals          as number  | undefined,
        learningStreak:   d.learningStreak  as number  | undefined,
        learningHours:    d.learningHours   as number  | undefined,
        lastLearningDate: d.lastLearningDate as string | undefined,
        aenumber:         d.aenumber        as number  | undefined,
        careerGoal:       d.careerGoal      as string  | undefined,
        careerGoalDate:   d.careerGoalDate  as number  | undefined,
        lastStreakReset:  d.lastStreakReset  as string  | undefined,

        // ── Notifications ─────────────────────────────────────────────────────
        receiveEmailNotifications: d.receiveEmailNotifications as boolean | undefined,
        emailPreferences:          d.emailPreferences          as UserProfile['emailPreferences'],
        chatbotUsageCount:         d.chatbotUsageCount         as number  | undefined,
        lastChatbotUsageDate:      d.lastChatbotUsageDate      as string  | undefined,

        // ── Clock-in state (flat fields on user doc) ──────────────────────────
        status:           (d.status as string)          ?? undefined,
        clockInTime:      (d.clockInTime as number)     ?? undefined,
        clockOutTime:     (d.clockOutTime as number)    ?? undefined,
        dailyMs:          (d.dailyMs as number)         ?? undefined,
        weeklyMs:         (d.weeklyMs as number)        ?? undefined,
        lastClockOutDate: (d.lastClockOutDate as string) ?? undefined,
        lastClockOutWeek: (d.lastClockOutWeek as string) ?? undefined,
        breakStartTime:   (d.breakStartTime as number)  ?? null,

        // ── Session management ────────────────────────────────────────────────
        sessionRevocationCount: (d.sessionRevocationCount as number)  ?? undefined,
        forceLogoutTime:        (d.forceLogoutTime as number)         ?? null,
        loggedOutFromAllDevices:(d.loggedOutFromAllDevices as boolean)?? undefined,
        revocationId:           (d.revocationId as string)            ?? undefined,
        deleteRequestedAt:      (d.deleteRequestedAt as number)       ?? null,

        // ── Employment status ─────────────────────────────────────────────────
        accountStatus: (d.accountStatus as AccountStatus) ?? 'active',
        shiftStatus:   (d.shiftStatus   as ShiftStatus)   ?? 'offshift',

        // ── Shift hours (only shiftStartTime & shiftEndTime) ─────────────────
        shiftStartTime: (d.shiftStartTime as string) || DEFAULT_SHIFT_START,
        shiftEndTime:   (d.shiftEndTime   as string) || DEFAULT_SHIFT_END,
      } satisfies UserProfile);
    },
    (err: any) => {
      if ((err as any).code !== 'permission-denied') {
        console.warn('[agunwami-backend] UserProfile snapshot error:', err);
      }
    },
  );
}
