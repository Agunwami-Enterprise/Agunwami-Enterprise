/**
 * firestore-admin.ts
 *
 * Server-side Firestore access via the Firebase REST API.
 * Uses the AEHub project credentials (aehub-eafa6).
 *
 * Public reads use Firestore rules that allow unauthenticated access.
 * Authenticated reads accept the caller's Firebase ID token and remain
 * subject to Firestore rules. CEO server routes use backend/core/firestore,
 * which authenticates with Google Application Default Credentials.
 */

import 'server-only';

const PROJECT_ID = process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID || 'aehub-eafa6';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FirestoreDocument {
  [key: string]: unknown;
}

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
  nullValue?: null;
  timestampValue?: string;
}

interface RawFirestoreDoc {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

// ── Value extractor ────────────────────────────────────────────────────────────

function extractValue(val: FirestoreValue): unknown {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue, 10);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue) {
    return (val.arrayValue.values ?? []).map(extractValue);
  }
  if (val.mapValue?.fields) {
    return extractFields(val.mapValue.fields);
  }
  return undefined;
}

function extractFields(fields: Record<string, FirestoreValue>): FirestoreDocument {
  const out: FirestoreDocument = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = extractValue(v);
  }
  return out;
}

function docToObject(raw: RawFirestoreDoc): FirestoreDocument | null {
  if (!raw?.fields) return null;
  const obj = extractFields(raw.fields);
  // Attach the document id from the name path
  if (raw.name) {
    const parts = raw.name.split('/');
    obj._id = parts[parts.length - 1];
  }
  return obj;
}

// ── Filter helper ─────────────────────────────────────────────────────────────

type FilterOp = '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains';

interface Filter {
  field: string;
  op: FilterOp;
  value: string | number | boolean;
}

function buildQueryBody(
  collectionId: string,
  filters: Filter[] = [],
  orderByField?: string,
  limitCount?: number,
) {
  const where =
    filters.length > 0
      ? {
          compositeFilter: {
            op: 'AND',
            filters: filters.map((f) => ({
              fieldFilter: {
                field: { fieldPath: f.field },
                op: mapOp(f.op),
                value: wrapValue(f.value),
              },
            })),
          },
        }
      : undefined;

  return {
    structuredQuery: {
      from: [{ collectionId }],
      ...(where ? { where } : {}),
      ...(orderByField
        ? { orderBy: [{ field: { fieldPath: orderByField }, direction: 'DESCENDING' }] }
        : {}),
      ...(limitCount ? { limit: limitCount } : {}),
    },
  };
}

function mapOp(op: FilterOp): string {
  const map: Record<FilterOp, string> = {
    '==': 'EQUAL',
    '<': 'LESS_THAN',
    '<=': 'LESS_THAN_OR_EQUAL',
    '>': 'GREATER_THAN',
    '>=': 'GREATER_THAN_OR_EQUAL',
    '!=': 'NOT_EQUAL',
    'array-contains': 'ARRAY_CONTAINS',
  };
  return map[op];
}

function wrapValue(v: string | number | boolean): FirestoreValue {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number')
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { booleanValue: v };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Read a single document from the AEHub Firestore without auth.
 * Works for documents readable with `allow read: if true` rules.
 */
export async function getPublicFirestoreDoc(
  collection: string,
  docId: string,
): Promise<FirestoreDocument | null> {
  const url = `${BASE_URL}/${collection}/${docId}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const raw: RawFirestoreDoc = await res.json();
  return docToObject(raw);
}

/**
 * Read a single document using a Bearer token (for auth-protected collections).
 */
export async function getFirestoreDoc(
  collection: string,
  docId: string,
  idToken?: string,
): Promise<FirestoreDocument | null> {
  const url = `${BASE_URL}/${collection}/${docId}`;
  const headers: HeadersInit = idToken ? { Authorization: `Bearer ${idToken}` } : {};
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) return null;
  const raw: RawFirestoreDoc = await res.json();
  return docToObject(raw);
}

/**
 * Run a structured query against the AEHub Firestore (no auth).
 * Works for collections readable with `allow read: if true`.
 */
export async function queryPublicFirestoreCollection(
  collection: string,
  filters: Filter[] = [],
  orderByField?: string,
  limitCount?: number,
): Promise<FirestoreDocument[]> {
  const url = `${BASE_URL}:runQuery`;
  const body = buildQueryBody(collection, filters, orderByField, limitCount);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) return [];

  const rows: Array<{ document?: RawFirestoreDoc }> = await res.json();
  return rows
    .map((r) => (r.document ? docToObject(r.document) : null))
    .filter(Boolean) as FirestoreDocument[];
}

/**
 * Run a structured query with a Bearer token (for auth-protected collections).
 */
export async function getFirestoreCollection(
  collection: string,
  filters: Filter[] = [],
  orderByField?: string,
  limitCount?: number,
  idToken?: string,
): Promise<FirestoreDocument[]> {
  const url = `${BASE_URL}:runQuery`;
  const body = buildQueryBody(collection, filters, orderByField, limitCount);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) return [];

  const rows: Array<{ document?: RawFirestoreDoc }> = await res.json();
  return rows
    .map((r) => (r.document ? docToObject(r.document) : null))
    .filter(Boolean) as FirestoreDocument[];
}

/**
 * List all documents in a collection (no auth required).
 */
export async function listPublicCollection(
  collection: string,
): Promise<FirestoreDocument[]> {
  const url = `${BASE_URL}/${collection}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];
  const data: { documents?: RawFirestoreDoc[] } = await res.json();
  return (data.documents ?? [])
    .map(docToObject)
    .filter(Boolean) as FirestoreDocument[];
}
