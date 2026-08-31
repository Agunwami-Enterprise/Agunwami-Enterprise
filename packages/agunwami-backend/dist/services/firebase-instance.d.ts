import type { Firestore } from 'firebase/firestore';
/** Register the Firestore instance for all shared services to use. */
export declare function initBackend(db: Firestore): void;
/** @internal Used by shared services — do not call from app code. */
export declare function getDb(): Firestore;
