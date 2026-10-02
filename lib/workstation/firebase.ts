import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { initBackend } from 'agunwami-backend';

const AUTH_APP_NAME = 'ae-workstation';
const DATA_APP_NAME = 'ae-enterprise-data';
const ENTERPRISE_PROJECT_ID = process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_PROJECT_ID
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  || 'agunwami';

const authConfig = {
  apiKey: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'dummy-api-key',
  authDomain: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'agunwami.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'agunwami',
  storageBucket: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'agunwami.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
  databaseURL: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_DATABASE_URL || `https://${process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'agunwami'}-default-rtdb.firebaseio.com`,
};

const dataConfig = {
  apiKey: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_AUTH_DOMAIN,
  projectId: ENTERPRISE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_DATABASE_URL
    || `https://${ENTERPRISE_PROJECT_ID}-default-rtdb.firebaseio.com`,
};

const authApp = getApps().some(app => app.name === AUTH_APP_NAME)
  ? getApp(AUTH_APP_NAME)
  : initializeApp(authConfig, AUTH_APP_NAME);
const isNewDataApp = !getApps().some(app => app.name === DATA_APP_NAME);
const dataApp = isNewDataApp
  ? initializeApp(dataConfig, DATA_APP_NAME)
  : getApp(DATA_APP_NAME);

const auth = getAuth(authApp);
const authDb = getFirestore(authApp);

if (isNewDataApp) {
  try {
    initializeFirestore(dataApp, { experimentalAutoDetectLongPolling: true });
  } catch {
    // ignore if already initialized
  }
}
const db = getFirestore(dataApp);

// Keep business data isolated from the workstation auth/profile Firebase project.
initBackend(db);

const storage = getStorage(dataApp);
const rtdb = getDatabase(dataApp);
const googleProvider = new GoogleAuthProvider();

export { authApp as app, auth, authDb, dataApp, db, storage, rtdb, googleProvider };
