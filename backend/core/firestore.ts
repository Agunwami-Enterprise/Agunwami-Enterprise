/**
 * backend/core/firestore.ts
 *
 * Authenticated Firestore REST client with token management, auto-refresh,
 * and full CRUD support (read, write, update, delete, query).
 */

// Enforce server-only execution in Next.js
if (typeof window !== 'undefined') {
  throw new Error('This module can only be loaded on the server.');
}
import { FIREBASE_CONFIG } from '../config/firebase.config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { FirestoreDoc, QueryOptions } from './types';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let credentialInstance: any = null;
let serviceUserRetryAt = 0;

const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

/**
 * Ensures local Application Default Credentials (ADC) file exists if the user
 * has logged in via Firebase CLI (`firebase login`), without requiring gcloud CLI.
 */
function ensureLocalAdcFromFirebaseCli(): boolean {
  try {
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.config', 'configstore', 'firebase-tools.json');
    if (!fs.existsSync(configPath)) return false;

    const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const refreshToken = fbConfig?.tokens?.refresh_token;
    if (!refreshToken) return false;

    const gcloudDir = process.env.APPDATA
      ? path.join(process.env.APPDATA, 'gcloud')
      : path.join(homedir, '.config', 'gcloud');
    const adcPath = path.join(gcloudDir, 'application_default_credentials.json');

    if (!fs.existsSync(adcPath)) {
      if (!fs.existsSync(gcloudDir)) {
        fs.mkdirSync(gcloudDir, { recursive: true });
      }
      const adc = {
        client_id: FIREBASE_CLI_CLIENT_ID,
        client_secret: FIREBASE_CLI_CLIENT_SECRET,
        refresh_token: refreshToken,
        type: 'authorized_user',
      };
      fs.writeFileSync(adcPath, JSON.stringify(adc, null, 2), 'utf8');
      console.log('[backend/core/firestore] Auto-configured local ADC from Firebase CLI credentials.');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Direct OAuth2 token refresh from local Firebase CLI refresh token as fallback.
 */
async function fetchTokenFromFirebaseCli(): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.config', 'configstore', 'firebase-tools.json');
    if (!fs.existsSync(configPath)) return null;

    const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const refreshToken = fbConfig?.tokens?.refresh_token;
    if (!refreshToken) return null;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: FIREBASE_CLI_CLIENT_ID,
        client_secret: FIREBASE_CLI_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
    };
  } catch {
    return null;
  }
}

/**
 * Keyless credential for hosts where service account keys are not allowed:
 * sign in as a dedicated Firebase Auth user and use its ID token. Firestore
 * then applies firestore.rules, which grant this user access via isBackend().
 */
async function fetchTokenAsServiceUser(): Promise<{ access_token: string; expires_in: number } | null> {
  const email = process.env.FIRESTORE_SERVICE_USER_EMAIL?.trim();
  const password = process.env.FIRESTORE_SERVICE_USER_PASSWORD;
  if (!email || !password || !FIREBASE_CONFIG.apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(FIREBASE_CONFIG.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
        cache: 'no-store',
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.idToken) {
      console.warn('[backend/core/firestore] Firestore service user sign-in failed:', data?.error?.message || res.status);
      return null;
    }
    return { access_token: data.idToken, expires_in: Number(data.expiresIn) || 3600 };
  } catch (err) {
    console.warn('[backend/core/firestore] Firestore service user sign-in failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Loads firebase-admin on first use. Next.js keeps it external, so it is
 * resolved from the host's node_modules at runtime; a static import would
 * fail every route that touches Firestore if the package is missing there.
 */
async function loadFirebaseAdmin(): Promise<typeof import('firebase-admin/app') | null> {
  try {
    return await import('firebase-admin/app');
  } catch (e) {
    console.warn('[backend/core/firestore] firebase-admin could not be loaded; Firestore is unavailable:', e);
    return null;
  }
}

async function initCredential(): Promise<any> {
  const admin = await loadFirebaseAdmin();
  if (!admin) return null;
  const { applicationDefault, cert } = admin;

  // 1. Service account JSON in environment variable (for production hosting e.g. Vercel, Railway, App Hosting)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      const jsonStr = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonStr);
      return cert(parsed);
    } catch (e) {
      console.warn('[backend/core/firestore] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to ADC:', e);
    }
  }

  // 2. Local serviceAccountKey.json if present in project root
  const localKeyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  if (fs.existsSync(localKeyPath)) {
    try {
      return cert(localKeyPath);
    } catch (e) {
      console.warn('[backend/core/firestore] Failed to load local serviceAccountKey.json:', e);
    }
  }

  // 3. Ensure local ADC exists from Firebase CLI if gcloud wasn't run
  ensureLocalAdcFromFirebaseCli();

  // 4. Standard Application Default Credentials (ADC)
  try {
    return applicationDefault();
  } catch (e) {
    console.warn('[backend/core/firestore] applicationDefault() credentials not available:', e);
    return null;
  }
}

/**
 * Returns a Google Cloud access token for server-side Firestore REST requests.
 */
export async function getAdminAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  // An explicitly configured service user wins over the admin credential
  // lookup, whose ADC probe can stall on hosts outside Google Cloud.
  if (process.env.FIRESTORE_SERVICE_USER_EMAIL) {
    // Back off after a failed sign-in so a wrong password does not trip
    // Firebase Auth's rate limit on every request.
    if (now < serviceUserRetryAt) return null;
    const serviceUser = await fetchTokenAsServiceUser();
    if (!serviceUser) {
      serviceUserRetryAt = now + 60_000;
      return null;
    }
    cachedToken = serviceUser.access_token;
    tokenExpiresAt = now + serviceUser.expires_in * 1000;
    return serviceUser.access_token;
  }

  try {
    if (!credentialInstance) {
      credentialInstance = await initCredential();
    }
    if (!credentialInstance) {
      const fallback = await fetchTokenFromFirebaseCli();
      if (fallback) {
        cachedToken = fallback.access_token;
        tokenExpiresAt = now + fallback.expires_in * 1000;
        return fallback.access_token;
      }
      return null;
    }

    const data = await credentialInstance.getAccessToken();
    if (!data?.access_token) {
      console.warn('[backend/core/firestore] Google Cloud credentials returned no access token.');
      return null;
    }
    const accessToken: string = data.access_token;
    cachedToken = accessToken;
    tokenExpiresAt = now + data.expires_in * 1000;
    return accessToken;
  } catch (err) {
    // If ADC failed, attempt direct token refresh from Firebase CLI
    const fallback = await fetchTokenFromFirebaseCli();
    if (fallback) {
      cachedToken = fallback.access_token;
      tokenExpiresAt = now + fallback.expires_in * 1000;
      return fallback.access_token;
    }

    console.warn('[backend/core/firestore] Unable to get Google Cloud credentials for Firestore:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Value Unwrapping (Firestore REST -> Plain JS) ───────────────────────────

export function unwrapValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(unwrapValue);
  }
  if ('mapValue' in val) {
    return unwrapFields(val.mapValue?.fields || {});
  }
  return undefined;
}

export function unwrapFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = unwrapValue(v);
  }
  return result;
}

export function rawDocToObject(doc: any): FirestoreDoc | null {
  if (!doc) return null;
  const fields = doc.fields ? unwrapFields(doc.fields) : {};
  const nameParts = (doc.name || '').split('/');
  const id = nameParts[nameParts.length - 1];
  return { ...fields, _id: id, _createTime: doc.createTime, _updateTime: doc.updateTime };
}

// ── Value Wrapping (Plain JS -> Firestore REST) ─────────────────────────────

export function wrapValue(val: any): Record<string, any> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(wrapValue) } };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (typeof val === 'object') {
    return { mapValue: { fields: wrapFields(val) } };
  }
  return { stringValue: String(val) };
}

export function wrapFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && !key.startsWith('_')) {
      fields[key] = wrapValue(value);
    }
  }
  return fields;
}

// ── CRUD Methods ─────────────────────────────────────────────────────────────

/**
 * Fetch a single document by collection and ID.
 */
export async function getDoc(collection: string, docId: string): Promise<FirestoreDoc | null> {
  const token = await getAdminAuthToken();
  if (!token) return null;
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };

  const res = await fetch(`${FIREBASE_CONFIG.firestoreBaseUrl}/${collection}/${docId}`, {
    headers,
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`[backend/core/firestore] Failed to read ${collection}/${docId}:`, res.status);
    return null;
  }
  const raw = await res.json();
  return rawDocToObject(raw);
}

/**
 * List documents in a collection.
 */
export async function listDocs(collection: string, pageSize = 50): Promise<FirestoreDoc[]> {
  const token = await getAdminAuthToken();
  if (!token) return [];
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };

  const res = await fetch(`${FIREBASE_CONFIG.firestoreBaseUrl}/${collection}?pageSize=${pageSize}`, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`[backend/core/firestore] Failed to list ${collection}:`, res.status);
    return [];
  }

  const data = await res.json();
  return (data.documents || []).map(rawDocToObject).filter(Boolean) as FirestoreDoc[];
}

/**
 * Run a structured query on a collection.
 */
export async function queryCollection(
  collectionId: string,
  options: QueryOptions = {}
): Promise<FirestoreDoc[]> {
  const token = await getAdminAuthToken();
  if (!token) return [];
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const where = options.filters && options.filters.length > 0
    ? {
        compositeFilter: {
          op: 'AND',
          filters: options.filters.map(f => ({
            fieldFilter: {
              field: { fieldPath: f.field },
              op: f.op,
              value: typeof f.value === 'string'
                ? { stringValue: f.value }
                : typeof f.value === 'number'
                ? Number.isInteger(f.value)
                  ? { integerValue: String(f.value) }
                  : { doubleValue: f.value }
                : { booleanValue: f.value },
            },
          })),
        },
      }
    : undefined;

  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      ...(where ? { where } : {}),
      ...(options.orderByField
        ? {
            orderBy: [
              {
                field: { fieldPath: options.orderByField },
                direction: options.orderDirection || 'DESCENDING',
              },
            ],
          }
        : {}),
      ...(options.limit ? { limit: options.limit } : {}),
    },
  };

  const res = await fetch(`${FIREBASE_CONFIG.firestoreBaseUrl}:runQuery`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`[backend/core/firestore] Query ${collectionId} failed:`, res.status);
    return [];
  }

  const rows: Array<{ document?: any }> = await res.json();
  return rows
    .map(r => (r.document ? rawDocToObject(r.document) : null))
    .filter(Boolean) as FirestoreDoc[];
}

/**
 * Create a new document in a collection.
 */
export async function createDoc(
  collection: string,
  data: Record<string, any>,
  docId?: string
): Promise<FirestoreDoc | null> {
  const token = await getAdminAuthToken();
  if (!token) {
    console.error(`[backend/core/firestore] Create ${collection} failed: no auth token.`);
    return null;
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const url = docId
    ? `${FIREBASE_CONFIG.firestoreBaseUrl}/${collection}?documentId=${encodeURIComponent(docId)}`
    : `${FIREBASE_CONFIG.firestoreBaseUrl}/${collection}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields: wrapFields(data) }),
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`[backend/core/firestore] Create ${collection} failed:`, res.status, await res.text());
    return null;
  }

  const raw = await res.json();
  return rawDocToObject(raw);
}

/**
 * Update (patch) an existing document by ID.
 */
export async function updateDoc(
  collection: string,
  docId: string,
  data: Record<string, any>,
  updateMaskFields?: string[]
): Promise<FirestoreDoc | null> {
  const token = await getAdminAuthToken();
  if (!token) {
    console.error(`[backend/core/firestore] Update ${collection}/${docId} failed: no auth token.`);
    return null;
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fields = updateMaskFields || Object.keys(data).filter(k => !k.startsWith('_'));
  const maskQuery = fields.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const url = `${FIREBASE_CONFIG.firestoreBaseUrl}/${collection}/${docId}${maskQuery ? `?${maskQuery}` : ''}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields: wrapFields(data) }),
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`[backend/core/firestore] Update ${collection}/${docId} failed:`, res.status, await res.text());
    return null;
  }

  const raw = await res.json();
  return rawDocToObject(raw);
}

/**
 * Delete a document by collection and ID.
 */
export async function deleteDoc(collection: string, docId: string): Promise<boolean> {
  const token = await getAdminAuthToken();
  if (!token) {
    console.error(`[backend/core/firestore] Delete ${collection}/${docId} failed: no auth token.`);
    return false;
  }
  const headers: HeadersInit = { Authorization: `Bearer ${token}` };

  const res = await fetch(`${FIREBASE_CONFIG.firestoreBaseUrl}/${collection}/${docId}`, {
    method: 'DELETE',
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`[backend/core/firestore] Delete ${collection}/${docId} failed:`, res.status);
    return false;
  }

  return true;
}
