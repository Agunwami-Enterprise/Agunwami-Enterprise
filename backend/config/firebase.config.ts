/**
 * backend/config/firebase.config.ts
 *
 * Firebase environment configuration for AE Workstation & AEHub services.
 */

export const FIREBASE_CONFIG = {
  projectId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID || 'aehub-eafa6',
  apiKey: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_API_KEY || 'AIzaSyDCgDKKuLjCQE2V9O2uJ-2-MTjdONnoeM0',
  authDomain: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_AUTH_DOMAIN || 'aehub-eafa6.firebaseapp.com',
  storageBucket: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_STORAGE_BUCKET || 'aehub-eafa6.firebasestorage.app',
  databaseUrl: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_DATABASE_URL || 'https://aehub-eafa6-default-rtdb.firebaseio.com/',
  firestoreBaseUrl: `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID || 'aehub-eafa6'}/databases/(default)/documents`,
};
