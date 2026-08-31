import type { UserProfile } from '../types/user';
/**
 * Subscribes to the user's Firestore profile in real time.
 * Calls `cb` immediately and on every update.
 * Returns an unsubscribe function.
 */
export declare function subscribeUserProfile(uid: string, cb: (profile: UserProfile | null) => void): () => void;
