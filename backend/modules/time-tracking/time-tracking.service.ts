/**
 * backend/modules/time-tracking/time-tracking.service.ts
 *
 * Server-side Time Tracking & Attendance Service.
 * Fetches real attendance records from AEHub Firestore (attendanceLogs and users collections).
 */

import { listDocs } from '../../core/firestore';
import { getTodayDateKey } from '../../core/utils';
import type {
  AttendanceRecord,
  TimeTrackingSummary,
  DepartmentAttendance,
  TimeTrackingFilter,
  ClockStatus,
} from './time-tracking.types';

export class TimeTrackingService {
  /**
   * Retrieves today's executive attendance summary.
   */
  static async getTodaySummary(): Promise<TimeTrackingSummary> {
    const today = getTodayDateKey();
    const [attendanceLogs, users] = await Promise.all([
      listDocs('attendanceLogs', 100).catch(() => []),
      listDocs('users', 100).catch(() => []),
    ]);

    const staffMembers = users.filter(u => u.role === 'staff');
    const totalStaff = staffMembers.length;

    // Filter attendance for today
    const todayLogs = attendanceLogs.filter(a => a.dateKey === today || a._createTime?.startsWith(today));

    let clockedIn = 0;
    let onBreak = 0;
    let clockedOut = 0;
    let totalHours = 0;

    todayLogs.forEach(log => {
      const status = String(log.status || '').toLowerCase();
      if (status.includes('in') && !log.clockOutTime) {
        clockedIn++;
      } else if (status.includes('break')) {
        onBreak++;
      } else {
        clockedOut++;
      }
      totalHours += Number(log.totalHours) || 0;
    });

    const attendanceRate = totalStaff > 0 ? Math.round(((clockedIn + onBreak) / totalStaff) * 100) : 0;

    return {
      totalStaff,
      clockedIn,
      onBreak,
      clockedOut: Math.max(0, totalStaff - clockedIn - onBreak),
      attendanceRate,
      totalHoursWorkedToday: Math.round(totalHours * 10) / 10,
      date: today,
    };
  }

  /**
   * Lists attendance logs with optional date, department, and status filters.
   */
  static async getAttendanceLogs(filter: TimeTrackingFilter = {}): Promise<AttendanceRecord[]> {
    const [attendanceLogs, users] = await Promise.all([
      listDocs('attendanceLogs', filter.limit || 100).catch(() => []),
      listDocs('users', 100).catch(() => []),
    ]);

    const userEmailMap = new Map<string, string>();
    users.forEach(u => {
      if (u.email) {
        userEmailMap.set(u._id, u.email);
        userEmailMap.set(u.displayName || u.name, u.email);
      }
    });

    let records: AttendanceRecord[] = attendanceLogs.map(log => {
      const status: ClockStatus =
        log.status === 'On Break' || log.status === 'Break'
          ? 'On Break'
          : log.clockOutTime
          ? 'Clocked Out'
          : 'Clocked In';

      return {
        id: log._id,
        userId: log.userId || '',
        userName: log.userName || log.name || 'Staff Member',
        userEmail: log.userEmail || userEmailMap.get(log.userId) || userEmailMap.get(log.userName),
        department: log.department || log.dept || 'Operations',
        dateKey: log.dateKey || log._createTime?.split('T')[0] || getTodayDateKey(),
        status,
        clockInTime: log.clockInTime || log.clockIn || null,
        clockOutTime: log.clockOutTime || log.clockOut || null,
        totalHours: Number(log.totalHours) || 0,
        notes: log.notes,
        isLate: Boolean(log.isLate),
      };
    });

    if (filter.date) {
      records = records.filter(r => r.dateKey === filter.date);
    }
    if (filter.department) {
      records = records.filter(r => r.department.toLowerCase() === filter.department!.toLowerCase());
    }
    if (filter.status) {
      records = records.filter(r => r.status === filter.status);
    }
    if (filter.userId) {
      records = records.filter(r => r.userId === filter.userId);
    }

    return records;
  }

  /**
   * Breakdown of attendance and hours across departments.
   */
  static async getDepartmentBreakdown(): Promise<DepartmentAttendance[]> {
    const [attendanceLogs, users] = await Promise.all([
      listDocs('attendanceLogs', 100).catch(() => []),
      listDocs('users', 100).catch(() => []),
    ]);

    const staffMembers = users.filter(u => u.role === 'staff');
    const deptStaffMap = new Map<string, number>();
    const deptPresentMap = new Map<string, number>();
    const deptHoursMap = new Map<string, number>();

    staffMembers.forEach(s => {
      const dept = s.dept || s.department || 'Operations';
      deptStaffMap.set(dept, (deptStaffMap.get(dept) || 0) + 1);
    });

    attendanceLogs.forEach(log => {
      const dept = log.department || log.dept || 'Operations';
      if (log.status === 'Clocked In' || (!log.clockOutTime && log.clockInTime)) {
        deptPresentMap.set(dept, (deptPresentMap.get(dept) || 0) + 1);
      }
      deptHoursMap.set(dept, (deptHoursMap.get(dept) || 0) + (Number(log.totalHours) || 0));
    });

    const result: DepartmentAttendance[] = [];
    deptStaffMap.forEach((staffCount, dept) => {
      const presentCount = deptPresentMap.get(dept) || 0;
      const hours = deptHoursMap.get(dept) || 0;
      result.push({
        department: dept,
        staffCount,
        presentCount,
        attendanceRate: staffCount > 0 ? Math.round((presentCount / staffCount) * 100) : 0,
        totalHoursWorked: Math.round(hours * 10) / 10,
      });
    });

    return result;
  }
}
