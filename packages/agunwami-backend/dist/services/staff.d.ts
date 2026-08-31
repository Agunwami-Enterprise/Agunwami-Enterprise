import type { Member, StaffStatus, ClockStatus } from '../types/staff';
export type { Member, StaffStatus, ClockStatus };
/** Subscribe to all staff in the `users` collection. */
export declare function subscribeStaff(cb: (members: Member[]) => void): () => void;
