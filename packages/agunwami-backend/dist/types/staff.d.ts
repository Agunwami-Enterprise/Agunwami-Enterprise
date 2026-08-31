import type { UserRole } from './user';
export type StaffStatus = 'Active' | 'Inactive' | 'On Leave' | 'Suspended' | 'Fired';
export type ClockStatus = 'Clocked In' | 'Clocked Out' | 'On Break';
export interface Member {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    department: string;
    departmentPosition: string;
    departmentPermissions?: string[];
    isDepartmentAdmin?: boolean;
    status: StaffStatus;
    clockStatus: ClockStatus;
    lastSeen?: string;
    initials: string;
    color: string;
    photoURL?: string;
    shiftStartTime?: string;
    shiftEndTime?: string;
}
