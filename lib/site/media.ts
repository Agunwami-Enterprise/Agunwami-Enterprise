/**
 * Images uploaded in the C-panel. Stored in data/uploads on the server
 * (persistent on the Namecheap host) and served by /api/site/media/[name].
 */

import 'server-only';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

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

export async function saveUpload(file: File): Promise<string> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error('Upload a PNG, JPG, WebP or GIF image.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Images must be 5 MB or smaller.');
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(bytes, ext)) throw new Error('That file is not a valid image.');

  const name = `${randomUUID()}.${ext}`;
  fs.mkdirSync(uploadsDir(), { recursive: true });
  fs.writeFileSync(path.join(uploadsDir(), name), bytes);
  return `/api/site/media/${name}`;
}

export function readUpload(name: string): { bytes: Buffer; contentType: string } | null {
  if (!NAME_PATTERN.test(name)) return null;
  const filePath = path.join(uploadsDir(), name);
  if (!fs.existsSync(filePath)) return null;
  return { bytes: fs.readFileSync(filePath), contentType: CONTENT_TYPES[name.split('.').pop()!] };
}
