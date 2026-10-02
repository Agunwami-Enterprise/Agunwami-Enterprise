/**
 * backend/config/firebase.config.ts
 *
 * Firebase configuration for enterprise business data.
 */

const projectId = process.env.ENTERPRISE_FIREBASE_PROJECT_ID
  || process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_PROJECT_ID
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  || 'agunwami';

export const FIREBASE_CONFIG = {
  projectId,
  firestoreBaseUrl: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`,
};
