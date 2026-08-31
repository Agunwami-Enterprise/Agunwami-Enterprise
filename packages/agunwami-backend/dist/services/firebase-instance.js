"use strict";
// ─── Firebase Instance ────────────────────────────────────────────────────────
// Call `initBackend(db)` once at app startup (before rendering) to register
// the Firestore instance. All shared services then call `getDb()` internally.
//
// Usage (in each app's Firebase init file or root layout):
//   import { initBackend } from 'agunwami-backend';
//   import { db } from '@/lib/firebase'; // your app's own firebase.ts
//   initBackend(db);
Object.defineProperty(exports, "__esModule", { value: true });
exports.initBackend = initBackend;
exports.getDb = getDb;
let _db = null;
/** Register the Firestore instance for all shared services to use. */
function initBackend(db) {
    _db = db;
}
/** @internal Used by shared services — do not call from app code. */
function getDb() {
    if (!_db) {
        throw new Error('[agunwami-backend] Firestore not initialized. ' +
            'Call initBackend(db) before using any shared service.');
    }
    return _db;
}
