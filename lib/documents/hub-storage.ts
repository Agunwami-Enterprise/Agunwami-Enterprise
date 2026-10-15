/**
 * Files uploaded to Documents live in AE Hub's Firebase Storage. The server
 * reads them for the browser (converting for the editor, downloading),
 * because AE Hub's storage doesn't let the browser read them directly; only
 * AE Hub's own storage addresses are accepted, never an arbitrary one.
 */

import 'server-only';

const PROJECT = process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID || 'aehub-eafa6';

// The bucket now, and the older appspot.com name files uploaded earlier may use.
const BUCKETS = new Set([
  process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_STORAGE_BUCKET || `${PROJECT}.firebasestorage.app`,
  `${PROJECT}.firebasestorage.app`,
  `${PROJECT}.appspot.com`,
]);

/** The address, if it's a file in AE Hub's storage. */
export function hubFileUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.hostname === 'firebasestorage.googleapis.com') {
    const bucket = /^\/v0\/b\/([^/]+)\/o\//.exec(url.pathname)?.[1];
    return bucket && BUCKETS.has(decodeURIComponent(bucket)) ? url : null;
  }
  if (url.hostname === 'storage.googleapis.com') {
    const bucket = url.pathname.split('/')[1];
    return bucket && BUCKETS.has(bucket) ? url : null;
  }
  return null;
}
