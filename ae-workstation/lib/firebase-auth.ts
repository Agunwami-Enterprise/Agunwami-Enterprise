// Separate Firebase project for authentication and /users data.
// TODO: fill in NEXT_PUBLIC_AUTH_FIREBASE_* env vars once the new project's
// config is available — auth2/db2 stay undefined until then, so the rest of
// the app can render without crashing (see authFirebaseConfigured below).

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const authFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_AUTH_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_AUTH_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_AUTH_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_AUTH_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_AUTH_FIREBASE_APP_ID,
};

export const authFirebaseConfigured = Boolean(
  authFirebaseConfig.apiKey && authFirebaseConfig.projectId && authFirebaseConfig.appId,
);

const AUTH_APP_NAME = 'ae-auth';

let authApp: FirebaseApp | undefined;
let auth2: Auth | undefined;
let db2: Firestore | undefined;

if (authFirebaseConfigured) {
  authApp = getApps().find(a => a.name === AUTH_APP_NAME)
    ?? initializeApp(authFirebaseConfig, AUTH_APP_NAME);
  auth2 = getAuth(authApp);
  db2 = getFirestore(authApp);
}

export { authApp, auth2, db2 };
