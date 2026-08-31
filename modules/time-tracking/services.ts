// ─── Time Tracking Services — Thin Re-export ──────────────────────────────────
export {
  todayId, monthId,
  subscribeToday, subscribeMonthlySummary, subscribeLiveTeam,
  getDay, computeLiveTotals,
  clockIn, clockOut, startBreak, resumeWork,
} from 'agunwami-backend';

export type { StaffLiveInfo } from 'agunwami-backend';
