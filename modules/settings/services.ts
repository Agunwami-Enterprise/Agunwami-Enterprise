import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/workstation/firebase';

export interface UserProfile {
  uid: string; name: string; email: string; role: string;
  department: string; phone?: string; avatarUrl?: string;
  joinDate?: string; position?: string; location?: string;
}

// Write operations go through Cloud Functions and are restricted by Firestore rules.
export function subscribeUserProfile(uid: string, cb: (profile: UserProfile | null) => void): () => void {
  if (!uid || !db) { cb(null); return () => {}; }
  return onSnapshot(
    doc(db, 'users', uid),
    snap => {
      if (!snap.exists()) { cb(null); return; }
      const data = snap.data();
      cb({
        uid,
        name:       (data.displayName || data.name || '') as string,
        email:      (data.email as string) ?? '',
        role:       (data.role as string) ?? '',
        department: (data.department as string) ?? '',
        phone:      data.phone as string | undefined,
        avatarUrl:  (data.photoURL || data.avatarUrl) as string | undefined,
        joinDate:   data.joinDate
          ? (data.joinDate as { toDate(): Date }).toDate().toISOString().split('T')[0]
          : undefined,
        position:   data.position as string | undefined,
        location:   data.location as string | undefined,
      });
    },
    err => {
      console.warn('UserProfile snapshot error:', err);
    }
  );
}
