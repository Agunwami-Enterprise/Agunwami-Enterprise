/**
 * backend/config/firebase.config.ts
 *
 * Firebase configuration for enterprise business data.
 */

const projectId = process.env.ENTERPRISE_FIREBASE_PROJECT_ID
  || process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_PROJECT_ID
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  || 'agunwami-enterprise';

// Web API key of the same project; used to sign in the backend's service
// user (see backend/core/firestore.ts). Firebase web API keys are public.
const apiKey = process.env.ENTERPRISE_FIREBASE_API_KEY
  || process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_API_KEY
  || process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  || '';

export const FIREBASE_CONFIG = {
  projectId,
  apiKey,
  firestoreBaseUrl: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`,
};
