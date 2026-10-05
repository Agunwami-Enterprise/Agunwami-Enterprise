/**
 * backend/modules/time-tracking/time-tracking.types.ts
 *
 * Types for CEO Time Tracking & Attendance.
 */

export type ClockStatus = 'Clocked In' | 'Clocked Out' | 'On Break';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  department: string;
  dateKey: string;
  status: ClockStatus;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHours: number;
  notes?: string;
  isLate?: boolean;
}

export interface TimeTrackingSummary {
  totalStaff: number;
  clockedIn: number;
  onBreak: number;
  clockedOut: number;
  attendanceRate: number;
  totalHoursWorkedToday: number;
  date: string;
}

export interface DepartmentAttendance {
  department: string;
  staffCount: number;
  presentCount: number;
  attendanceRate: number;
  totalHoursWorked: number;
}

export interface TimeTrackingFilter {
  date?: string;
  department?: string;
  status?: ClockStatus;
  userId?: string;
  limit?: number;
}
