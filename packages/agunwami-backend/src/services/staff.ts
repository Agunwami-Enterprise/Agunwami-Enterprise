// ─── Staff Service ────────────────────────────────────────────────────────────

import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getDb } from './firebase-instance';
import type { Member, StaffStatus, ClockStatus } from '../types/staff';
import { getStaffDisplayName, getStaffAvatar, getStaffPhone, getStaffPosition, getStaffPermissions } from '../types/user';

export type { Member, StaffStatus, ClockStatus };

const PALETTE = [
  '#f5bd02','#8b5cf6','#3b82f6','#22c55e','#7c3aed',
  '#0d9488','#f97316','#ec4899','#14b8a6','#6366f1',
  '#dc2626','#84cc16',
];

function colorFor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function toMember(id: string, data: Record<string, any>): Member {
  const name = getStaffDisplayName(data);
  const statusStr = (data.status || 'Active') as string;
  let status: StaffStatus = 'Active';
  if (statusStr.toLowerCase() === 'inactive') status = 'Inactive';
  else if (statusStr.toLowerCase() === 'on leave' || statusStr.toLowerCase() === 'leave') status = 'On Leave';
  else if (statusStr.toLowerCase() === 'suspended' || data.isSuspended || data.accountStatus === 'suspended') status = 'Suspended';
  else if (statusStr.toLowerCase() === 'fired' || data.isFired || data.accountStatus === 'fired') status = 'Fired';

  let clockStatus: ClockStatus = 'Clocked Out';
  if (statusStr === 'Clocked In') clockStatus = 'Clocked In';
  else if (statusStr === 'On Break') clockStatus = 'On Break';

  return {
    id,
    name,
    email: (data.email || '') as string,
    phone: getStaffPhone(data),
    role: 'staff',
    department: (data.department || '') as string,
    departmentPosition: getStaffPosition(data),
    departmentPermissions: getStaffPermissions(data),
    isDepartmentAdmin: !!data.isDepartmentAdmin,
    status,
    clockStatus,
    lastSeen: data.lastActiveTime ? new Date(data.lastActiveTime).toLocaleString() : new Date().toLocaleString(),
    initials: name.split(' ').map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase() || 'ST',
    color: colorFor(id),
    photoURL: getStaffAvatar(data),
    shiftStartTime: data.shiftStartTime,
    shiftEndTime: data.shiftEndTime,
  };
}

/** Subscribe to all staff in the `users` collection. */
export function subscribeStaff(cb: (members: Member[]) => void): () => void {
  const q = query(collection(getDb(), 'users'), where('role', '==', 'staff'));
  return onSnapshot(
    q,
    (snap: any) => cb(snap.docs.map((d: any) => toMember(d.id, d.data()))),
    (err: any) => console.warn('[agunwami-backend] Staff snapshot error:', err),
  );
}
