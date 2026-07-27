import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// Cloud Functions removed for now — no backend functions are deployed at
// this stage. All sensitive operations (staff account creation, role
// assignment, approvals, payment initiation, scheduled jobs) will be
// reintroduced here as Cloud Functions when that work resumes.

export const helloWorld = onRequest((request, response) => {
  logger.info('AE Workstation Functions — placeholder', { structuredData: true });
  response.send('AE Workstation Functions are running.');
});
