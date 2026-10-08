/**
 * backend/modules/site-content/site-content.store.ts
 *
 * Storage for C-panel content. Uses Firestore when the server has
 * credentials (see backend/core/firestore.ts), otherwise a JSON file in
 * data/ — the Namecheap host has a persistent disk. Only one store is used
 * at a time.
 *
 * A collection keeps showing its defaults until the first edit; that edit
 * first saves the defaults, so editing one item never hides the others.
 * Read errors throw rather than look like an empty collection, so an
 * outage can neither blank the site nor overwrite edits with defaults.
 */

import fs from 'fs';
import path from 'path';
import { FIREBASE_CONFIG } from '../../config/firebase.config';
import { getAdminAuthToken, rawDocToObject, wrapFields } from '../../core/firestore';
import type { SiteCollectionName, SiteContentCollections, SiteSettings } from './site-content.types';

const FIRESTORE_COLLECTIONS: Record<SiteCollectionName, string> = {
  team: 'site_team',
  articles: 'site_articles',
  partnershipCategories: 'site_partnership_categories',
  applications: 'site_partnership_applications',
};
const META_PATH = 'site_content_meta/state';
const SETTINGS_PATH = 'site_settings/main';
const DOC_META_FIELDS = ['_id', '_createTime', '_updateTime', 'order'];

interface LocalStore {
  seeded: Partial<Record<SiteCollectionName, boolean>>;
  collections: Partial<{ [K in SiteCollectionName]: SiteContentCollections[K][] }>;
  settings?: SiteSettings;
}

// ── Firestore REST (throws on failure, unlike the shared helpers) ───────────

async function firestoreRequest(docPath: string, init: RequestInit = {}): Promise<unknown | null> {
  const token = await getAdminAuthToken();
  if (!token) throw new Error('Firestore credentials are unavailable.');
  const res = await fetch(`${FIREBASE_CONFIG.firestoreBaseUrl}/${docPath}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore ${init.method || 'GET'} ${docPath} failed with ${res.status}.`);
  return res.status === 204 ? {} : res.json();
}

function stripMeta<T>(doc: Record<string, unknown>): T {
  const item = { ...doc };
  for (const field of DOC_META_FIELDS) delete item[field];
  return item as T;
}

async function firestoreList<K extends SiteCollectionName>(name: K): Promise<SiteContentCollections[K][]> {
  const docs: Record<string, unknown>[] = [];
  let pageToken = '';
  do {
    const query = `?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const page = await firestoreRequest(`${FIRESTORE_COLLECTIONS[name]}${query}`) as
      { documents?: unknown[]; nextPageToken?: string } | null;
    for (const raw of page?.documents ?? []) {
      const doc = rawDocToObject(raw);
      if (doc) docs.push(doc);
    }
    pageToken = page?.nextPageToken ?? '';
  } while (pageToken);
  docs.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  return docs.map(doc => stripMeta<SiteContentCollections[K]>(doc));
}

async function firestoreWrite(docPath: string, data: Record<string, unknown>): Promise<void> {
  // PATCH without an update mask replaces the whole document.
  await firestoreRequest(docPath, { method: 'PATCH', body: JSON.stringify({ fields: wrapFields(data) }) });
}

async function firestoreGetFields(docPath: string): Promise<Record<string, unknown> | null> {
  const raw = await firestoreRequest(docPath);
  return raw ? stripMeta<Record<string, unknown>>(rawDocToObject(raw) ?? {}) : null;
}

// ── Local JSON file ─────────────────────────────────────────────────────────

function localFilePath(): string {
  return path.join(process.cwd(), 'data', 'site_content.json');
}

function readLocal(): LocalStore {
  const filePath = localFilePath();
  if (!fs.existsSync(filePath)) return { seeded: {}, collections: {} };
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<LocalStore>;
  return { seeded: parsed.seeded ?? {}, collections: parsed.collections ?? {}, settings: parsed.settings };
}

function writeLocal(store: LocalStore): void {
  const filePath = localFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

// ── Public API ──────────────────────────────────────────────────────────────

async function usingFirestore(): Promise<boolean> {
  return Boolean(await getAdminAuthToken());
}

// Serializes writes so concurrent edits in this process cannot drop each other.
let writeQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

/** Items in display order, or null while the collection still shows its defaults. */
export async function readCollection<K extends SiteCollectionName>(name: K): Promise<SiteContentCollections[K][] | null> {
  if (await usingFirestore()) {
    const meta = await firestoreGetFields(META_PATH);
    if (!meta?.[name]) return null;
    return firestoreList(name);
  }
  const local = readLocal();
  return local.seeded[name] ? (local.collections[name] ?? []) as SiteContentCollections[K][] : null;
}

/**
 * Applies `change` to the collection and saves the result. `defaults` seeds
 * the collection if this is its first edit.
 */
export function updateCollection<K extends SiteCollectionName>(
  name: K,
  defaults: () => SiteContentCollections[K][] | Promise<SiteContentCollections[K][]>,
  change: (items: SiteContentCollections[K][]) => SiteContentCollections[K][],
): Promise<SiteContentCollections[K][]> {
  return serialized(async () => {
    const stored = await readCollection(name);
    const seeding = stored === null;
    const before = stored ?? await defaults();
    const after = change(before.map(item => ({ ...item })));

    if (await usingFirestore()) {
      const collection = FIRESTORE_COLLECTIONS[name];
      const keep = new Set(after.map(item => item.id));
      // Write only new, changed or moved items; a seeding edit writes them all.
      const previous = new Map(before.map((item, order) => [item.id, { json: JSON.stringify(item), order }]));
      for (const [order, item] of after.entries()) {
        const old = previous.get(item.id);
        if (!seeding && old && old.order === order && old.json === JSON.stringify(item)) continue;
        await firestoreWrite(`${collection}/${encodeURIComponent(item.id)}`, { ...item, order });
      }
      for (const item of before) {
        if (!keep.has(item.id)) await firestoreRequest(`${collection}/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      }
      const meta = (await firestoreGetFields(META_PATH)) ?? {};
      if (!meta[name]) await firestoreWrite(META_PATH, { ...meta, [name]: true });
    } else {
      const local = readLocal();
      local.collections = { ...local.collections, [name]: after };
      local.seeded = { ...local.seeded, [name]: true };
      writeLocal(local);
    }
    return after;
  });
}

export async function readSettings(): Promise<Partial<SiteSettings> | null> {
  if (await usingFirestore()) return firestoreGetFields(SETTINGS_PATH) as Promise<Partial<SiteSettings> | null>;
  return readLocal().settings ?? null;
}

export function writeSettings(settings: SiteSettings): Promise<void> {
  return serialized(async () => {
    if (await usingFirestore()) {
      await firestoreWrite(SETTINGS_PATH, settings as unknown as Record<string, unknown>);
    } else {
      const local = readLocal();
      writeLocal({ ...local, settings });
    }
  });
}
