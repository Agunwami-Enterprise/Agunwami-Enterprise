'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/workstation/auth-context';
import { DEFAULT_IN_APP, subscribeInAppPreferences, type InAppPreferences } from './services';

/** The signed-in person's in-app notification categories (Settings → Notifications). */
export function useInAppPreferences(): InAppPreferences {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<InAppPreferences>(DEFAULT_IN_APP);
  useEffect(() => (user?.uid ? subscribeInAppPreferences(user.uid, setPrefs) : undefined), [user?.uid]);
  return prefs;
}
