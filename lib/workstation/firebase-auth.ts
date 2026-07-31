// Re-export unified workstation Firebase app, auth, and firestore instances
// from ./firebase to avoid dual-instance authentication mismatches.

import { app, auth, db } from './firebase';

export const authFirebaseConfigured = true;
export const authApp = app;
export const auth2 = auth;
export const db2 = db;
