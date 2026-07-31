'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth as mainAuth, db as mainDb } from './firebase';
import { auth2, db2, authFirebaseConfigured } from './firebase-auth';

const auth = (authFirebaseConfigured && auth2) ? auth2 : mainAuth;
const db = (authFirebaseConfigured && db2) ? db2 : mainDb;

interface AuthContextValue {
  user: User | null;
  profile: any;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const hasRunRulesRef = useRef<string | null>(null);
  const nineAmTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 3. Automated Staff Clocking & 9:00 AM Start Time Scheduler
  useEffect(() => {
    if (!user?.uid || !profile) return;

    const runClockingRules = async (p: any) => {
      const now = Date.now();
      const nowDate = new Date(now);
      const todayStr = nowDate.toISOString().split('T')[0];

      const hour = nowDate.getHours();
      const minute = nowDate.getMinutes();
      const totalMinutes = hour * 60 + minute;

      const windowStart = 8 * 60 + 58; // 8:58 AM
      const windowEnd = 17 * 60;        // 5:00 PM
      const isWithinWindow = totalMinutes >= windowStart && totalMinutes <= windowEnd;

      const updates: any = {};
      let needsUpdate = false;

      // Rule A: Auto clock-in on first login of the day within shift window
      const clockInDate = p.clockInTime ? new Date(p.clockInTime).toISOString().split('T')[0] : null;
      const hasClockedInToday = p.status === 'Clocked In' || clockInDate === todayStr || p.lastClockOutDate === todayStr;

      if (!hasClockedInToday && isWithinWindow) {
        updates.status = 'Clocked In';
        updates.clockInTime = now;
        updates.clockOutTime = null;
        updates.dailyMs = 0;
        updates.breakStartTime = null;

        const currentAttended = p.attendedDates || [];
        if (!currentAttended.includes(todayStr)) {
          updates.attendedDates = [...currentAttended, todayStr];
        }
        needsUpdate = true;
      }

      // Rule B: Overnight & inactivity check for active Clocked In staff
      const lastActive = p.lastActiveTime || p.clockInTime || null;
      if (p.status === 'Clocked In' && lastActive) {
        const inactiveDuration = now - lastActive;

        if (inactiveDuration >= 4 * 60 * 60 * 1000) {
          const sessionDuration = lastActive - (p.clockInTime || lastActive);
          let targetDailyMs = p.dailyMs || 0;
          const lastActiveDateStr = new Date(lastActive).toISOString().split('T')[0];

          if (p.lastClockOutDate !== lastActiveDateStr) {
            targetDailyMs = 0;
          }

          if (sessionDuration > 0) {
            targetDailyMs += sessionDuration;
            updates.weeklyMs = (p.weeklyMs || 0) + sessionDuration;
          }

          updates.clockOutTime = lastActive;
          updates.dailyMs = targetDailyMs;
          updates.lastClockOutDate = lastActiveDateStr;
          updates.status = 'Clocked In';
          updates.clockInTime = now;
          updates.clockOutTime = null;
          updates.breakStartTime = null;

          if (lastActiveDateStr !== todayStr) {
            updates.dailyMs = 0;
          }

          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        try {
          await updateDoc(doc(db, 'users', user.uid), updates);
        } catch (err) {
          console.error('AuthContext: Failed to apply automated clocking updates', err);
        }
      }
    };

    if (hasRunRulesRef.current !== user.uid) {
      hasRunRulesRef.current = user.uid;
      runClockingRules(profile);
    }

    // Schedule 9:00 AM Shift Start Timer Reset
    const now = Date.now();
    const nowDate = new Date(now);
    const totalMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
    const nineAmBoundary = 9 * 60;

    if (totalMinutes < nineAmBoundary) {
      const nineAmToday = new Date(nowDate);
      nineAmToday.setHours(9, 0, 0, 0);
      const msUntilNineAm = nineAmToday.getTime() - now;

      if (nineAmTimerRef.current) {
        clearTimeout(nineAmTimerRef.current);
      }

      nineAmTimerRef.current = setTimeout(async () => {
        const nineAmMs = new Date().setHours(9, 0, 0, 0);
        const todayStr = new Date().toISOString().split('T')[0];

        const clockInUpdates: any = {
          status: 'Clocked In',
          clockInTime: nineAmMs, // exactly 9:00:00 AM
          clockOutTime: null,
          dailyMs: 0,            // shift officially starts at 9:00 AM
          breakStartTime: null,
          lastClockOutDate: todayStr,
        };

        try {
          await updateDoc(doc(db, 'users', user.uid), clockInUpdates);
        } catch (err) {
          console.error('AuthContext: 9 AM clock reset error:', err);
        }
      }, msUntilNineAm);
    }

    return () => {
      if (nineAmTimerRef.current) {
        clearTimeout(nineAmTimerRef.current);
      }
    };
  }, [user?.uid, profile]);

  async function signOut() {
    if (auth) await firebaseSignOut(auth);
    await fetch('/api/session', { method: 'DELETE' });
    window.location.href = '/auth/login';
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
