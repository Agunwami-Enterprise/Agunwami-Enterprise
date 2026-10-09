'use client';

/**
 * Notifications reported by each project's metrics endpoint (project-wide
 * events such as promotions or new support tickets), for the bell and the
 * Notifications page. They have no read state of their own.
 */

import { useEffect, useState } from 'react';
import type { ProjectNotificationItem } from '@/backend/modules/projects/projects.types';

export type { ProjectNotificationItem };

const REFRESH_MS = 2 * 60 * 1000;

export function useProjectNotifications(enabled = true) {
  const [items, setItems] = useState<ProjectNotificationItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/ceo/projects/notifications', { cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
        if (!cancelled) { setItems(body.notifications ?? []); setError(''); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load project notifications.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [enabled]);

  return { items, loading, error };
}

export function timeAgo(iso: string): string {
  const seconds = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return 'just now';
  const units: [number, string][] = [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [604800, 'week']];
  for (let i = units.length - 1; i >= 0; i--) {
    const [size, name] = units[i];
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

/** Same colours the workstation uses for its own notification categories. */
export function categoryColors(category: string): { bg: string; color: string } {
  if (category === 'tasks') return { bg: '#fee2e2', color: '#ef4444' };
  if (category === 'payments') return { bg: '#dbeafe', color: '#2563eb' };
  if (category === 'messages') return { bg: '#dcfce7', color: '#16a34a' };
  return { bg: '#fef9c3', color: '#d97706' };
}
