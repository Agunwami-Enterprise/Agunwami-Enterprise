// ─── Time Tracking Types ──────────────────────────────────────────────────────
// Firestore collection layout:
//   /timeTracking/{uid}/days/{YYYY-MM-DD}   → TimeTrackingDayDoc
//   /timeTracking/{uid}/monthlySummary/{YYYY-MM} → MonthlySummaryDoc
//   /timeTrackingLive/{uid}                 → TimeTrackingLiveDoc

import type { Timestamp } from 'firebase/firestore';

export type SessionType = 'work' | 'break';
export type DayStatus   = 'onshift' | 'onbreak' | 'offshift' | 'onleave' | 'suspended';

export interface TimeSession {
  type:  SessionType;
  start: Timestamp;
  end:   Timestamp | null;
}

export interface TimeTrackingDayDoc {
  date:                string;
  clockIn:             Timestamp;
  clockOut:            Timestamp | null;
  status:              DayStatus;
  totalWorkedMinutes:  number;
  totalBreakMinutes:   number;
  sessions:            TimeSession[];
  autoClosedOut?:      boolean;
}

export interface MonthlySummaryDoc {
  totalDaysWorked:  number;
  totalHoursWorked: number;
  daysPresent:      string[];
  daysAbsent:       string[];
  averageClockIn:   string;
}

export interface TimeTrackingLiveDoc {
  name:        string;
  role:        string;
  department:  string;
  status:      DayStatus;
  lastUpdated: Timestamp;
  todayClockIn: Timestamp | null;
}

/** Minimal staff info needed to write to time-tracking documents */
export interface StaffLiveInfo {
  name:       string;
  role:       string;
  department: string;
}
