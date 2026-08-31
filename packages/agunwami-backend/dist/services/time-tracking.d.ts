import { todayId, monthId } from '../utils/time';
import type { TimeTrackingDayDoc, MonthlySummaryDoc, TimeTrackingLiveDoc, TimeSession, StaffLiveInfo } from '../types/time-tracking';
export { todayId, monthId };
/** Subscribe to today's time-tracking document for a user. */
export declare function subscribeToday(uid: string, cb: (day: TimeTrackingDayDoc | null) => void): () => void;
/** Subscribe to a user's monthly summary document. */
export declare function subscribeMonthlySummary(uid: string, month: string, cb: (summary: MonthlySummaryDoc | null) => void): () => void;
/** Subscribe to the live team presence collection. */
export declare function subscribeLiveTeam(cb: (rows: Array<TimeTrackingLiveDoc & {
    uid: string;
}>) => void): () => void;
/** Fetch a specific day document (one-time read). */
export declare function getDay(uid: string, dateId: string): Promise<TimeTrackingDayDoc | null>;
/**
 * Computes worked and break minutes from a session array.
 * Uses `now` (epoch ms) for any session that hasn't ended yet.
 */
export declare function computeLiveTotals(sessions: TimeSession[] | undefined, now: number): {
    workedMinutes: number;
    breakMinutes: number;
};
/** Clock a staff member in for today. Creates a new day document. */
export declare function clockIn(uid: string, info: StaffLiveInfo): Promise<void>;
/** Start a break session. */
export declare function startBreak(uid: string, info: StaffLiveInfo): Promise<void>;
/** End a break and resume work. */
export declare function resumeWork(uid: string, info: StaffLiveInfo): Promise<void>;
/** Clock a staff member out for today. Calculates totals from sessions. */
export declare function clockOut(uid: string, info: StaffLiveInfo): Promise<void>;
