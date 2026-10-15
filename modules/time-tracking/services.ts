// ─── Time Tracking Services ───────────────────────────────────────────────────
import {
  subscribeToday as subscribeTodayIn,
  subscribeMonthlySummary as subscribeMonthlySummaryIn,
  subscribeLiveTeam as subscribeLiveTeamIn,
  getDay as getDayIn,
  clockIn as clockInIn,
  clockOut as clockOutIn,
  startBreak as startBreakIn,
  resumeWork as resumeWorkIn,
  type StaffLiveInfo,
} from 'agunwami-backend';
import type { MonthlySummaryDoc, TimeTrackingDayDoc, TimeTrackingLiveDoc } from 'agunwami-backend';
import { authDb } from '@/lib/workstation/firebase';

export { todayId, monthId, computeLiveTotals } from 'agunwami-backend';
export type { StaffLiveInfo } from 'agunwami-backend';

/*
 * Clock-ins (timeTracking/{uid} and timeTrackingLive) live in the workstation
 * Firebase project, where staff and the CEO are signed in and whose rules
 * allow them. The enterprise data project the shared package reads by default
 * has no signed-in user, so its rules refuse these reads and the page never
 * stopped loading.
 */

export function subscribeToday(
  uid: string,
  cb: (day: TimeTrackingDayDoc | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return subscribeTodayIn(uid, cb, authDb, onError);
}

export function subscribeMonthlySummary(
  uid: string,
  month: string,
  cb: (summary: MonthlySummaryDoc | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return subscribeMonthlySummaryIn(uid, month, cb, authDb, onError);
}

export function subscribeLiveTeam(
  cb: (rows: Array<TimeTrackingLiveDoc & { uid: string }>) => void,
  onError?: (error: Error) => void,
): () => void {
  return subscribeLiveTeamIn(cb, authDb, onError);
}

export const getDay = (uid: string, dateId: string) => getDayIn(uid, dateId, authDb);
export const clockIn = (uid: string, info: StaffLiveInfo) => clockInIn(uid, info, authDb);
export const clockOut = (uid: string, info: StaffLiveInfo) => clockOutIn(uid, info, authDb);
export const startBreak = (uid: string, info: StaffLiveInfo) => startBreakIn(uid, info, authDb);
export const resumeWork = (uid: string, info: StaffLiveInfo) => resumeWorkIn(uid, info, authDb);
