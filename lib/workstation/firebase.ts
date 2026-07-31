import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

const WORKSTATION_APP_NAME = 'ae-workstation';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_DATABASE_URL || `https://${process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
};

const app = getApps().find(a => a.name === WORKSTATION_APP_NAME)
  ?? initializeApp(firebaseConfig, WORKSTATION_APP_NAME);

const auth = getAuth(app);

let db: ReturnType<typeof getFirestore>;
try {
  db = getFirestore(app);
} catch {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
}

const storage = getStorage(app);
const rtdb = getDatabase(app);
const functions = getFunctions(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, rtdb, functions, httpsCallable, googleProvider };
