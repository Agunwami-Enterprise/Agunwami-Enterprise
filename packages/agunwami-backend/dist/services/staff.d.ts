import { type Firestore } from 'firebase/firestore';
import type { Member, StaffStatus, ClockStatus } from '../types/staff';
export type { Member, StaffStatus, ClockStatus };
/**
 * Subscribe to all staff in the `users` collection. Pass `db` when staff
 * accounts live in a different Firebase project than the business data.
 */
export declare function subscribeStaff(cb: (members: Member[]) => void, db?: Firestore): () => void;
