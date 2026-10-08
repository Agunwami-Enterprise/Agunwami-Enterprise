/**
 * Images uploaded in the C-panel, served by /api/site/media/[name].
 *
 * They're stored next to the content: in Firestore (`site_media`) when the
 * server has credentials, otherwise in data/uploads. Storing them on the
 * disk of whichever machine handled the upload broke images whenever
 * content was edited from another environment that shares the database
 * (e.g. a local dev server). Images are resized and re-encoded as WebP
 * first, which also keeps them within Firestore's 1 MiB document limit.
 */

import 'server-only';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { FIREBASE_CONFIG } from '@/backend/config/firebase.config';
import { getAdminAuthToken } from '@/backend/core/firestore';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Firestore documents are capped at 1 MiB; leave room for the other fields. */
const MAX_STORED_BYTES = 900_000;
const MAX_DIMENSION = 1920;
const MEDIA_COLLECTION = 'site_media';

// SVG is left out on purpose: it can carry scripts.
export const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_TYPES).map(([type, ext]) => [ext, type]),
);

/** File names this module creates: <uuid>.<ext>. */
const NAME_PATTERN = /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;

function uploadsDir(): string {
  return path.join(process.cwd(), 'data', 'uploads');
}

/** Checks the file's first bytes, so a renamed file can't pass as an image. */
function looksLikeImage(bytes: Buffer, ext: string): boolean {
  const hex = bytes.subarray(0, 12).toString('hex');
  switch (ext) {
    case 'png': return hex.startsWith('89504e470d0a1a0a');
    case 'jpg': return hex.startsWith('ffd8ff');
    case 'gif': return hex.startsWith('474946383');
    case 'webp': return hex.startsWith('52494646') && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    default: return false;
  }
}

/**
 * Fits the image within MAX_DIMENSION and re-encodes it as WebP, lowering
 * quality until it fits MAX_STORED_BYTES. GIFs are kept as they are (they
 * may be animated). Without sharp the original is kept.
 */
async function optimize(bytes: Buffer, ext: string): Promise<{ bytes: Buffer; ext: string }> {
  if (ext === 'gif') return { bytes, ext };
  let sharp: typeof import('sharp');
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('[lib/site/media] sharp is not installed; storing uploads without compression.');
    return { bytes, ext };
  }
  for (const [dimension, quality] of [[MAX_DIMENSION, 82], [MAX_DIMENSION, 65], [1280, 60]] as const) {
    const out = await sharp(bytes, { failOn: 'none' })
      .rotate()
      .resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (out.length <= MAX_STORED_BYTES || quality === 60) return { bytes: out, ext: 'webp' };
  }
  return { bytes, ext };
}

async function firestoreMedia(name: string, init: RequestInit = {}): Promise<Response | null> {
  const token = await getAdminAuthToken();
  if (!token) return null;
  return fetch(`${FIREBASE_CONFIG.firestoreBaseUrl}/${MEDIA_COLLECTION}/${encodeURIComponent(name)}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    cache: 'no-store',
  });
}

export async function saveUpload(file: File): Promise<string> {
  const originalExt = IMAGE_TYPES[file.type];
  if (!originalExt) throw new Error('Upload a PNG, JPG, WebP or GIF image.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Images must be 5 MB or smaller.');
  const original = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(original, originalExt)) throw new Error('That file is not a valid image.');

  const { bytes, ext } = await optimize(original, originalExt);
  if (bytes.length > MAX_STORED_BYTES) {
    throw new Error('That image is too large to store. Use a smaller image (under 900 KB, or any size if it can be compressed).');
  }
  const name = `${randomUUID()}.${ext}`;

  const res = await firestoreMedia(name, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        contentType: { stringValue: CONTENT_TYPES[ext] },
        data: { bytesValue: bytes.toString('base64') },
        size: { integerValue: String(bytes.length) },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (res) {
    if (!res.ok) throw new Error(`Could not store the image (Firestore ${res.status}).`);
  } else {
    fs.mkdirSync(uploadsDir(), { recursive: true });
    fs.writeFileSync(path.join(uploadsDir(), name), bytes);
  }
  return `/api/site/media/${name}`;
}

export async function readUpload(name: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!NAME_PATTERN.test(name)) return null;

  const res = await firestoreMedia(name);
  if (res && res.ok) {
    const doc = await res.json() as { fields?: { data?: { bytesValue?: string }; contentType?: { stringValue?: string } } };
    const data = doc.fields?.data?.bytesValue;
    if (data) {
      return { bytes: Buffer.from(data, 'base64'), contentType: doc.fields?.contentType?.stringValue || CONTENT_TYPES[name.split('.').pop()!] };
    }
  } else if (res && res.status !== 404) {
    throw new Error(`Could not read the image (Firestore ${res.status}).`);
  }

  // Uploads made while this server stored them on disk.
  const filePath = path.join(uploadsDir(), name);
  if (!fs.existsSync(filePath)) return null;
  return { bytes: fs.readFileSync(filePath), contentType: CONTENT_TYPES[name.split('.').pop()!] };
}
