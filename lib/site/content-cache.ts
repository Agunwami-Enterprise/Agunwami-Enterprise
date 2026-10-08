/**
 * Short in-memory cache for public-site content reads, so each page view
 * doesn't go to Firestore. C-panel saves clear it; other server processes
 * catch up within CACHE_MS.
 */

import 'server-only';

const CACHE_MS = 30_000;
const entries = new Map<string, { at: number; value: Promise<unknown> }>();

export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as Promise<T>;
  const value = load();
  entries.set(key, { at: Date.now(), value });
  // Never keep a failure: the next request tries again.
  value.catch(() => entries.delete(key));
  return value;
}

export function clearPublicContentCache(): void {
  entries.clear();
}
