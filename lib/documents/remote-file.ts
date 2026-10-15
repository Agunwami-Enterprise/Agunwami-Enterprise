/**
 * Reading a file's contents on the server, for showing, converting or
 * downloading it: files in AE Hub's storage, and other public https links
 * (some older documents point at files elsewhere). Addresses that resolve to
 * private, loopback or internal networks are refused, also after redirects,
 * so the server can't be used to reach anything that isn't public.
 */

import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { hubFileUrl } from './hub-storage';

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 20_000;

/** Whether an IP address is private, loopback, link-local or otherwise not public. */
function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a === '::1' || a === '::' || a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80')) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(a);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = address.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** The address if it's AE Hub's storage, or a public https address. */
async function allowed(value: string): Promise<URL | null> {
  const hub = hubFileUrl(value);
  if (hub) return hub;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (!addresses.length || addresses.some(a => isPrivateAddress(a.address))) return null;
  } catch {
    return null;
  }
  return url;
}

/** Fetches a file from an allowed address (following up to three redirects, each checked); null if not allowed. */
export async function fetchFile(value: string): Promise<Response | null> {
  let current = value;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await allowed(current);
    if (!url) return null;
    const res = await fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => null);
    if (!res) return null;
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }
    return res;
  }
  return null;
}
