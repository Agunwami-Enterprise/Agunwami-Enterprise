'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { clockIn as clockInService, clockOut as clockOutService, subscribeToday, todayId } from '@/modules/time-tracking/services';
import type { AccountStatus, ShiftStatus, UserProfile } from '@/modules/settings/services';

interface AuthContextValue {
  user: User | null;
  profile: any;
  loading: boolean;
  accountStatus: AccountStatus;
  shiftStatus: ShiftStatus;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  accountStatus: 'active',
  shiftStatus: 'offshift',
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hasRunRulesRef = useRef<string | null>(null);
  const nineAmTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived account & shift status from profile (safe defaults)
  const accountStatus: AccountStatus = (profile?.accountStatus as AccountStatus) ?? 'active';
  const shiftStatus: ShiftStatus     = (profile?.shiftStatus  as ShiftStatus)   ?? 'offshift';

  // 1. Firebase Auth listener
  useEffect(() => {
    if (!auth || !db) { setLoading(false); return; }
    const authInstance = auth;
    const dbInstance = db;
    return onAuthStateChanged(authInstance, async (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        setProfile(null);
      } else if (u.uid && u.email) {
        try {
          await setDoc(doc(dbInstance, 'users', u.uid), { email: u.email }, { merge: true });
        } catch {
          // silently ignore — email still shows from Firebase Auth fallback
        }
      }
    });
  }, []);

  // 2. Real-time Firestore user profile listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('AuthContext: Profile snapshot error', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // 3. Account-status enforcement: fired → immediate sign-out
  useEffect(() => {
    if (!profile) return;
    if (accountStatus === 'fired') {
      // Sign out and redirect with reason
      (async () => {
        try {
          if (auth) await firebaseSignOut(auth);
          await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
        } finally {
          window.location.href = '/auth/login?reason=fired';
        }
      })();
    }
  }, [accountStatus, profile]);

  // 4. Suspended enforcement: force clock-out if currently active
  useEffect(() => {
    if (!user?.uid || !profile?.name || accountStatus !== 'suspended') return;
    const uid = user.uid;
    const unsub = subscribeToday(uid, async (dayDoc) => {
      unsub(); // one-shot
      if (dayDoc && (dayDoc.status === 'onshift' || dayDoc.status === 'onbreak')) {
        try {
          await clockOutService(uid, {
            name:       profile.name       ?? '',
            role:       profile.role       ?? '',
            department: profile.department ?? '',
          });
        } catch (err) {
          console.error('AuthContext: Force clock-out for suspended user failed', err);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, accountStatus]);

  // 5. Automated clock-in & 9 AM scheduler — only for onshift, active users
  useEffect(() => {
    // Wait for a fully-loaded profile
    if (!user?.uid || !profile?.name) return;
    // Fired users are handled by effect #3 above; never proceed
    if (accountStatus === 'fired') return;
    // Suspended users: no auto clock-in
    if (accountStatus === 'suspended') return;
    // Only auto clock-in if the admin has assigned onshift
    if (shiftStatus !== 'onshift') return;

    const uid   = user.uid;
    const today = todayId();

    const runClockingRules = async () => {
      const now          = Date.now();
      const nowDate      = new Date(now);
      const hour         = nowDate.getHours();
      const minute       = nowDate.getMinutes();
      const totalMinutes = hour * 60 + minute;

      const windowStart    = 8 * 60 + 58; // 8:58 AM
      const windowEnd      = 17 * 60;      // 5:00 PM
      const isWithinWindow = totalMinutes >= windowStart && totalMinutes <= windowEnd;

      if (!isWithinWindow) return;

      // One-shot check: only clock in if not already clocked in today
      const unsubCheck = subscribeToday(uid, async (dayDoc) => {
        unsubCheck();
        if (!dayDoc) {
          try {
            await clockInService(uid, {
              name:       profile.name       ?? '',
              role:       profile.role       ?? '',
              department: profile.department ?? '',
            });
          } catch (err) {
            console.error('AuthContext: Auto clock-in failed', err);
          }
        }
      });
    };

    // Only fire once per (uid + calendar day) — resets each new day
    const runKey = `${uid}:${today}`;
    if (hasRunRulesRef.current !== runKey) {
      hasRunRulesRef.current = runKey;
      runClockingRules();
    }

    // Schedule 9:00 AM auto clock-in for onshift users already logged in before 9 AM
    const now          = Date.now();
    const nowDate      = new Date(now);
    const totalMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

    if (totalMinutes < 9 * 60) {
      const nineAmToday = new Date(nowDate);
      nineAmToday.setHours(9, 0, 0, 0);
      const msUntilNineAm = nineAmToday.getTime() - now;

      if (nineAmTimerRef.current) clearTimeout(nineAmTimerRef.current);

      nineAmTimerRef.current = setTimeout(async () => {
        // Re-check suspended/fired at the time the timer fires
        if (accountStatus !== 'active' || shiftStatus !== 'onshift') return;
        try {
          const unsubNine = subscribeToday(uid, async (dayDoc) => {
            unsubNine();
            if (!dayDoc) {
              await clockInService(uid, {
                name:       profile.name       ?? '',
                role:       profile.role       ?? '',
                department: profile.department ?? '',
              });
            }
          });
        } catch (err) {
          console.error('AuthContext: 9 AM auto clock-in error:', err);
        }
      }, msUntilNineAm);
    }

    return () => {
      if (nineAmTimerRef.current) clearTimeout(nineAmTimerRef.current);
    };
  }, [user?.uid, profile, accountStatus, shiftStatus]);

  async function signOut() {
    if (auth) await firebaseSignOut(auth);
    await fetch('/api/session', { method: 'DELETE' });
    window.location.href = '/auth/login';
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, accountStatus, shiftStatus, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
