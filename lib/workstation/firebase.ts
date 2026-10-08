import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { initBackend } from 'agunwami-backend';

const AUTH_APP_NAME = 'ae-workstation';
const DATA_APP_NAME = 'ae-enterprise-data';
const DEFAULT_WORKSTATION_CONFIG = {
  apiKey: 'AIzaSyDCgDKKuLjCQE2V9O2uJ-2-MTjdONnoeM0',
  authDomain: 'aehub-eafa6.firebaseapp.com',
  projectId: 'aehub-eafa6',
  storageBucket: 'aehub-eafa6.firebasestorage.app',
  messagingSenderId: '511641141289',
  appId: '1:511641141289:web:a44d561dc1f9ab8e50dc38',
  databaseURL: 'https://aehub-eafa6-default-rtdb.firebaseio.com/',
};

const DEFAULT_ENTERPRISE_CONFIG = {
  apiKey: 'AIzaSyBinzrMIqO16uxZrBToc-JO5spxAz6_E04',
  authDomain: 'agunwami-enterprise.firebaseapp.com',
  projectId: 'agunwami-enterprise',
  storageBucket: 'agunwami-enterprise.firebasestorage.app',
  messagingSenderId: '838884099596',
  appId: '1:838884099596:web:f4ccc1e79555bd1ee45029',
};

const ENTERPRISE_PROJECT_ID = process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_PROJECT_ID
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  || DEFAULT_ENTERPRISE_CONFIG.projectId;

const authConfig = {
  apiKey: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_API_KEY
    || process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    || DEFAULT_WORKSTATION_CONFIG.apiKey,
  authDomain: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_AUTH_DOMAIN
    || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    || DEFAULT_WORKSTATION_CONFIG.authDomain,
  projectId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || DEFAULT_WORKSTATION_CONFIG.projectId,
  storageBucket: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_STORAGE_BUCKET
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    || DEFAULT_WORKSTATION_CONFIG.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_MESSAGING_SENDER_ID
    || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    || DEFAULT_WORKSTATION_CONFIG.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_APP_ID
    || process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    || DEFAULT_WORKSTATION_CONFIG.appId,
  databaseURL: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_DATABASE_URL
    || `https://${process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID || DEFAULT_WORKSTATION_CONFIG.projectId}-default-rtdb.firebaseio.com`,
};

const dataConfig = {
  apiKey: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_API_KEY
    || process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    || DEFAULT_ENTERPRISE_CONFIG.apiKey,
  authDomain: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_AUTH_DOMAIN
    || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    || DEFAULT_ENTERPRISE_CONFIG.authDomain,
  projectId: ENTERPRISE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_STORAGE_BUCKET
    || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    || DEFAULT_ENTERPRISE_CONFIG.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_MESSAGING_SENDER_ID
    || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    || DEFAULT_ENTERPRISE_CONFIG.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_APP_ID
    || process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    || DEFAULT_ENTERPRISE_CONFIG.appId,
  databaseURL: process.env.NEXT_PUBLIC_ENTERPRISE_FIREBASE_DATABASE_URL
    || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
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

const storage = getStorage(authApp);
const rtdb = getDatabase(
  authApp,
  process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_DATABASE_URL
    || authConfig.databaseURL
    || DEFAULT_WORKSTATION_CONFIG.databaseURL
);
const googleProvider = new GoogleAuthProvider();

export { authApp as app, auth, authDb, dataApp, db, storage, rtdb, googleProvider };
