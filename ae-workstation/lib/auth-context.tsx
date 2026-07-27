'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth2 as auth, db2 as db, authFirebaseConfigured } from './firebase-auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authFirebaseConfigured || !auth || !db) { setLoading(false); return; }
    const authInstance = auth;
    const dbInstance = db;
    return onAuthStateChanged(authInstance, async (u) => {
      setUser(u);
      setLoading(false);
      if (u?.uid && u?.email) {
        try {
          await setDoc(doc(dbInstance, 'users', u.uid), { email: u.email }, { merge: true });
        } catch {
          // silently ignore — email still shows from Firebase Auth fallback
        }
      }
    });
  }, []);

  async function signOut() {
    if (auth) await firebaseSignOut(auth);
    await fetch('/api/session', { method: 'DELETE' });
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
