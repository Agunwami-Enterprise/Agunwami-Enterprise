// ─── Firebase Instance ────────────────────────────────────────────────────────
// Call `initBackend(db)` once at app startup (before rendering) to register
// the Firestore instance. All shared services then call `getDb()` internally.
//
// Usage (in each app's Firebase init file or root layout):
//   import { initBackend } from 'agunwami-backend';
//   import { db } from '@/lib/firebase'; // your app's own firebase.ts
//   initBackend(db);

import type { Firestore } from 'firebase/firestore';

let _db: Firestore | null = null;

/** Register the Firestore instance for all shared services to use. */
export function initBackend(db: Firestore): void {
  _db = db;
}

/** @internal Used by shared services — do not call from app code. */
export function getDb(): Firestore {
  if (!_db) {
    throw new Error(
      '[agunwami-backend] Firestore not initialized. ' +
      'Call initBackend(db) before using any shared service.'
    );
  }
  return _db;
}
