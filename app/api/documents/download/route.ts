/**
 * GET /api/documents/download?url=…&name=…
 *
 * Downloads a file uploaded to Documents (rather than opening it in the
 * browser, as its own address does), under its own name: from AE Hub's
 * storage or a public https link (see lib/documents/remote-file); for
 * signed-in workstation users.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/workstation/api-auth';
import { fetchFile } from '@/lib/documents/remote-file';

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const params = new URL(request.url).searchParams;
  const name = (params.get('name') ?? '').replace(/[\r\n"\\/]+/g, ' ').trim().slice(0, 150) || 'document';
  // ?inline=1 shows a PDF in the page (e.g. a scanned one that can't be converted). Only ever as a PDF.
  const inline = params.get('inline') === '1' && /\.pdf$/i.test(name);

  const res = await fetchFile(params.get('url') ?? '');
  if (!res) return NextResponse.json({ error: 'This file’s address can’t be downloaded here.' }, { status: 400 });
  if (!res.ok || !res.body) return NextResponse.json({ error: 'The file could not be read.' }, { status: 502 });
  const headers = new Headers({
    'Content-Type': inline ? 'application/pdf' : res.headers.get('content-type') || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    'Cache-Control': 'private, no-store',
  });
  const length = res.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new NextResponse(res.body, { headers });
}
