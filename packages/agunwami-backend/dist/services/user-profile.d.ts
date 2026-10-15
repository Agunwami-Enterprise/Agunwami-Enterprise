import { type Firestore } from 'firebase/firestore';
import type { UserProfile } from '../types/user';
/**
 * Subscribes to the user's Firestore profile in real time.
 * Calls `cb` immediately and on every update.
 * Returns an unsubscribe function. Pass `db` when profiles live in a
 * different Firebase project than the business data; on a read error `cb`
 * receives null and `onError` the error.
 */
export declare function subscribeUserProfile(uid: string, cb: (profile: UserProfile | null) => void, db?: Firestore, onError?: (error: Error) => void): () => void;
