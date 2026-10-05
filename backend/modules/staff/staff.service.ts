/**
 * backend/modules/staff/staff.service.ts
 *
 * Server-side Staff Management Service.
 * Fetches real staff members strictly from AEHub Firestore users collection (role == 'staff'),
 * joining with attendanceLogs for live clock status with zero dummy fallbacks.
 */

import { listDocs, getDoc } from '../../core/firestore';
import { formatRelativeTime } from '../../core/utils';
import type {
  StaffMember,
  StaffStats,
  StaffFilter,
  StaffStatus,
  ClockStatus,
} from './staff.types';

const AVATAR_COLORS = [
  '#f5bd02',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#06b6d4',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColorForString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function isStaffActive(u: any): boolean {
  if (u.disabled === true || u.isDisabled === true) return false;
  if (u.isFired === true || u.fired === true) return false;
  if (u.isSuspended === true) return false;
  const s = String(u.status || '').toLowerCase().trim();
  if (s === 'disabled' || s === 'fired' || s === 'inactive' || s === 'suspended' || s === 'terminated') {
    return false;
  }
  return true;
}

export class StaffService {
  /**
   * High-level staff statistics across departments.
   */
  static async getStaffStats(): Promise<StaffStats> {
    const [users, attendance, leaveReqs] = await Promise.all([
      listDocs('users', 100).catch(() => []),
      listDocs('attendanceLogs', 100).catch(() => []),
      listDocs('leaveRequests', 100).catch(() => []),
    ]);

    const staffUsers = users.filter(u => u.role === 'staff' || u.isStaff === true);
    const totalStaff = staffUsers.length;

    // Active staff: employed staff whose accounts are NOT disabled or fired
    const activeStaff = staffUsers.filter(isStaffActive).length;

    // Clocked in staff: staff members actively clocked in on duty today
    const today = new Date().toISOString().split('T')[0];
    const clockedInToday = staffUsers.filter(u => {
      const status = String(u.status || '').toLowerCase().trim();
      if (status === 'clocked in') return true;

      const isToday = u.initialClockInDate === today || u.lastClockInDate === today;
      const clockIn = Number(u.clockInTime) || 0;
      const clockOut = Number(u.clockOutTime) || 0;
      if (isToday && clockIn > clockOut) return true;

      const todayLog = attendance.find(a =>
        (a.userId === u.uid || a.userId === u._id || a.userEmail === u.email) &&
        (a.dateKey === today || a._createTime?.startsWith(today))
      );
      if (todayLog) {
        const logStatus = String(todayLog.status || '').toLowerCase();
        if ((logStatus.includes('in') || logStatus.includes('progress')) && !todayLog.clockOutTime) {
          return true;
        }
      }

      return false;
    }).length;

    // On leave currently
    const onLeave = leaveReqs.filter(l =>
      (l.status as string)?.toLowerCase() === 'approved'
    ).length;

    // Group by department
    const byDepartment: Record<string, number> = {};
    staffUsers.forEach(u => {
      const dept = String(u.dept || u.department || 'Operations').toUpperCase();
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });

    return {
      totalStaff,
      activeStaff,
      clockedInToday,
      activeToday: activeStaff,
      onLeave,
      departmentsCount: Object.keys(byDepartment).length,
      byDepartment,
    };
  }

  /**
   * Fetches the complete directory of staff members with live status.
   */
  static async getStaffList(filter: StaffFilter = {}): Promise<StaffMember[]> {
    const [users, attendance] = await Promise.all([
      listDocs('users', 100).catch(() => []),
      listDocs('attendanceLogs', 100).catch(() => []),
    ]);

    // Build map of latest attendance by userId or userName
    const attendanceMap = new Map<string, { status: ClockStatus; lastSeen: string }>();
    attendance.forEach(a => {
      const uid = a.userId || a.userName;
      if (!uid) return;
      const status: ClockStatus =
        a.status === 'On Break' || a.status === 'Break'
          ? 'On Break'
          : a.clockOutTime
          ? 'Clocked Out'
          : 'Clocked In';

      attendanceMap.set(uid, {
        status,
        lastSeen: formatRelativeTime(a.clockInTime || a._createTime),
      });
    });

    const staffUsers = users.filter(u => u.role === 'staff');

    let members: StaffMember[] = staffUsers.map(u => {
      const name = u.displayName || u.name || u.email?.split('@')[0] || 'Staff Member';
      const att = attendanceMap.get(u._id) || attendanceMap.get(name) || {
        status: 'Clocked Out' as ClockStatus,
        lastSeen: 'offline',
      };

      const dept = u.dept || u.department || 'Operations';
      const status: StaffStatus =
        u.status === 'Suspended'
          ? 'Suspended'
          : u.status === 'Inactive'
          ? 'Inactive'
          : 'Active';

      return {
        id: u._id,
        name,
        email: u.email || '',
        phone: u.phone,
        role: u.role || 'staff',
        department: dept,
        departmentPosition: u.jobTitle || u.position || (dept === 'ceo' ? 'Executive Director' : 'Specialist'),
        status,
        clockStatus: att.status,
        lastSeen: att.lastSeen,
        initials: getInitials(name),
        color: getColorForString(name),
        photoURL: u.avatarUrl || u.photoURL,
        joinedAt: u.joinedAt || u._createTime,
        createdAt: u._createTime,
      };
    });

    if (filter.department) {
      members = members.filter(m => m.department.toLowerCase() === filter.department!.toLowerCase());
    }
    if (filter.status) {
      members = members.filter(m => m.status === filter.status);
    }
    if (filter.clockStatus) {
      members = members.filter(m => m.clockStatus === filter.clockStatus);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      members = members.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q)
      );
    }

    return members;
  }

  /**
   * Retrieves single staff member details.
   */
  static async getStaffById(id: string): Promise<StaffMember | null> {
    const [doc, attendance] = await Promise.all([
      getDoc('users', id),
      listDocs('attendanceLogs', 100).catch(() => []),
    ]);

    if (!doc || doc.role !== 'staff') return null;

    const name = doc.displayName || doc.name || doc.email || 'Staff Member';
    const dept = doc.dept || doc.department || 'Operations';

    const userAttendance = attendance.find(a => a.userId === id || a.userName === name);
    const clockStatus: ClockStatus = userAttendance?.status === 'On Break'
      ? 'On Break'
      : userAttendance && !userAttendance.clockOutTime
      ? 'Clocked In'
      : 'Clocked Out';

    return {
      id: doc._id,
      name,
      email: doc.email || '',
      phone: doc.phone,
      role: doc.role,
      department: dept,
      departmentPosition: doc.jobTitle || 'Staff Member',
      status: (doc.status as StaffStatus) || 'Active',
      clockStatus,
      lastSeen: formatRelativeTime(userAttendance?.clockInTime || userAttendance?._createTime),
      initials: getInitials(name),
      color: getColorForString(name),
      photoURL: doc.avatarUrl,
      joinedAt: doc.joinedAt || doc._createTime,
      createdAt: doc._createTime,
    };
  }
}
