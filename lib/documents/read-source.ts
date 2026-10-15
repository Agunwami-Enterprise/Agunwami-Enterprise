/**
 * The file a conversion request is about: either one in AE Hub's storage
 * (JSON { url, name }) or one sent with the request (form data "file", e.g.
 * a template being added).
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { hubFileUrl } from './hub-storage';

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
  const url = hubFileUrl(typeof body.url === 'string' ? body.url : '');
  if (!url) return NextResponse.json({ error: 'Only files uploaded to Documents can be opened.' }, { status: 400 });
  const res = await fetch(url, { cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ error: 'The file could not be read.' }, { status: 502 });
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return NextResponse.json({ error: 'The file is too large (over 25 MB).' }, { status: 413 });
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_BYTES) return NextResponse.json({ error: 'The file is too large (over 25 MB).' }, { status: 413 });
  return { buffer, name, ext: name.split('.').pop()?.toLowerCase() ?? '' };
}
