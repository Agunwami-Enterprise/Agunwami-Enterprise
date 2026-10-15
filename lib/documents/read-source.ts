/**
 * The file a conversion request is about: either one at an address (JSON
 * { url, name }: AE Hub's storage or a public https link, see remote-file) or one sent with the request (form data "file", e.g.
 * a template being added).
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { fetchFile } from './remote-file';

const MAX_BYTES = 25 * 1024 * 1024;

export type Source = { buffer: Buffer; name: string; ext: string };

export async function readSource(request: Request): Promise<Source | NextResponse> {
  if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'Choose a file.' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'The file is too large (over 25 MB).' }, { status: 413 });
    const name = file.name || 'file';
    return { buffer: Buffer.from(await file.arrayBuffer()), name, ext: name.split('.').pop()?.toLowerCase() ?? '' };
  }
  const body = await request.json().catch(() => ({})) as { url?: unknown; name?: unknown };
  const name = typeof body.name === 'string' ? body.name : '';
  const res = await fetchFile(typeof body.url === 'string' ? body.url : '');
  if (!res) return NextResponse.json({ error: 'This file’s address can’t be opened here. Download it instead.' }, { status: 400 });
  if (!res.ok) return NextResponse.json({ error: 'The file could not be read (it may have been moved or deleted).' }, { status: 502 });
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return NextResponse.json({ error: 'The file is too large (over 25 MB).' }, { status: 413 });
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_BYTES) return NextResponse.json({ error: 'The file is too large (over 25 MB).' }, { status: 413 });
  return { buffer, name, ext: name.split('.').pop()?.toLowerCase() ?? '' };
}
