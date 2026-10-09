// ─── Staff ────────────────────────────────────────────────────────────────────
import { subscribeStaff as subscribeStaffIn, type Member } from 'agunwami-backend';
import { authDb } from '@/lib/workstation/firebase';

export type { Member, StaffStatus, ClockStatus } from 'agunwami-backend';

/**
 * Staff accounts live in the workstation (AE Hub) Firebase project, where the
 * CEO is signed in, not in the enterprise data project the shared package
 * reads by default (whose rules refuse this query).
 */
export function subscribeStaff(cb: (members: Member[]) => void): () => void {
  return subscribeStaffIn(cb, authDb);
}
