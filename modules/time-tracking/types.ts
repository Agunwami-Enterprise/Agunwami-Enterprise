import type { Timestamp } from 'firebase/firestore';

export type SessionType = 'work' | 'break';
export type DayStatus = 'active' | 'break' | 'clocked-out';

export interface TimeSession {
  type: SessionType;
  start: Timestamp;
  end: Timestamp | null;
}

// /timeTracking/{uid}/days/{YYYY-MM-DD}
export interface TimeTrackingDayDoc {
  date: string;
  clockIn: Timestamp;
  clockOut: Timestamp | null;
  status: DayStatus;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  sessions: TimeSession[];
  autoClosedOut?: boolean;
}

// /timeTracking/{uid}/monthlySummary/{YYYY-MM}
export interface MonthlySummaryDoc {
  totalDaysWorked: number;
  totalHoursWorked: number;
  daysPresent: string[];
  daysAbsent: string[];
  averageClockIn: string;
}

// /timeTrackingLive/{uid}
export interface TimeTrackingLiveDoc {
  name: string;
  role: string;
  department: string;
  status: DayStatus;
  lastUpdated: Timestamp;
  todayClockIn: Timestamp | null;
}
