import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// TODO (Stage 3): Add real Cloud Functions here.
// All sensitive operations — staff account creation, role assignment, approvals,
// payment initiation — MUST be implemented as Cloud Functions, never as direct
// client-side Firestore writes. Firestore security rules are a backstop only.

export const helloWorld = onRequest((request, response) => {
  logger.info('AE Workstation Functions — placeholder', { structuredData: true });
  response.send('AE Workstation Functions are running.');
});
