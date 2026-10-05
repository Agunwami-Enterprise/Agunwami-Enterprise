/**
 * backend/modules/staff/staff.types.ts
 *
 * Types for CEO Staff Management & Directory.
 */

export type StaffStatus = 'Active' | 'Inactive' | 'On Leave' | 'Suspended';
export type ClockStatus = 'Clocked In' | 'Clocked Out' | 'On Break';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  departmentPosition: string;
  status: StaffStatus;
  clockStatus: ClockStatus;
  lastSeen?: string;
  initials: string;
  color: string;
  photoURL?: string;
  joinedAt?: string;
  createdAt?: string;
}

export interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  clockedInToday: number;
  activeToday: number;
  onLeave: number;
  departmentsCount: number;
  byDepartment: Record<string, number>;
}

export interface StaffFilter {
  department?: string;
  status?: StaffStatus;
  clockStatus?: ClockStatus;
  search?: string;
}
