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
import type { FirestoreDoc, QueryOptions } from './types';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Returns a valid Firebase Auth ID Token for server-side REST requests.
 */
export async function getAdminAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60_000) {
    return cachedToken;
  }

  const email = process.env.WORKSTATION_FIRESTORE_AUTH_EMAIL || 'that.dev.guy.aeceo@aehub.io';
  const password = process.env.WORKSTATION_FIRESTORE_AUTH_PASSWORD;
  if (!password) {
    console.error('[backend/core/firestore] WORKSTATION_FIRESTORE_AUTH_PASSWORD is not configured.');
    return null;
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.error('[backend/core/firestore] Auth failed:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    cachedToken = data.idToken;
    const expiresInSec = parseInt(data.expiresIn || '3600', 10);
    tokenExpiresAt = now + expiresInSec * 1000;
    return cachedToken;
  } catch (err) {
    console.error('[backend/core/firestore] Auth network error:', err);
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
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${FIREBASE_CONFIG.firestoreBaseUrl}/${collection}/${docId}`, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const raw = await res.json();
  return rawDocToObject(raw);
}

/**
 * List documents in a collection.
 */
export async function listDocs(collection: string, pageSize = 50): Promise<FirestoreDoc[]> {
  const token = await getAdminAuthToken();
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

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
