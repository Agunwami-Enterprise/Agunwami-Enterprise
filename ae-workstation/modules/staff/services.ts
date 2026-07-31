import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Staff creation and role changes must go through Cloud Functions.
// Security rules are the backstop; services here are read-only.

export type StaffRole   = 'CEO' | 'Admin' | 'Manager' | 'Accountant' | 'Live Tutor' | 'Customer Care' | 'General Staff';
export type StaffStatus = 'Active' | 'Inactive' | 'On Leave';
export type ClockStatus = 'Clocked In' | 'Clocked Out';

export interface Member {
  id: string; name: string; title: string; email: string;
  role: StaffRole; status: StaffStatus; clockStatus: ClockStatus;
  lastSeen: string; initials: string; color: string; department: string;
}

const PALETTE = ['#f5bd02','#8b5cf6','#3b82f6','#22c55e','#7c3aed','#0d9488','#f97316','#ec4899','#14b8a6','#6366f1','#dc2626','#84cc16'];

function colorFor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function mapRole(role: string): StaffRole {
  const map: Record<string, StaffRole> = {
    ceo: 'CEO', hr: 'Admin', manager: 'Manager', finance: 'Accountant',
    opm: 'Manager', staff: 'General Staff',
  };
  return map[role.toLowerCase()] ?? 'General Staff';
}

function toMember(id: string, data: Record<string, unknown>): Member {
  const name = (data.name as string) ?? 'Unknown';
  const status = (data.status as string) === 'active' ? 'Active' : 'Inactive';
  return {
    id,
    name,
    title:       (data.position as string) ?? (data.department as string) ?? '',
    email:       (data.email as string) ?? '',
    role:        mapRole((data.role as string) ?? 'staff'),
    status:      status as StaffStatus,
    clockStatus: 'Clocked Out',
    lastSeen:    new Date().toLocaleString(),
    initials:    name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
    color:       colorFor(id),
    department:  (data.department as string) ?? '',
  };
}

export function subscribeStaff(cb: (members: Member[]) => void): () => void {
  const q = query(collection(db, 'staff'), orderBy('name'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => toMember(d.id, d.data() as Record<string, unknown>)));
  });
}
