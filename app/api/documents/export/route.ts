/**
 * POST /api/documents/export { html, title, orientation } → a Word file (.docx)
 *
 * A document from the editor as a real Word document. Images are only kept
 * from AE Hub's storage (or inline), so the server never fetches an
 * arbitrary address on someone's behalf.
 */

import { NextResponse } from 'next/server';
import HTMLtoDOCX from '@turbodocx/html-to-docx';
import { requireSession } from '@/lib/workstation/api-auth';
import { hubFileUrl } from '@/lib/documents/hub-storage';

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({})) as { html?: unknown; title?: unknown; orientation?: unknown };
  const html = typeof body.html === 'string' ? body.html : '';
  if (!html || Buffer.byteLength(html) > MAX_BYTES) return NextResponse.json({ error: 'This document can’t be exported.' }, { status: 400 });
  const title = (typeof body.title === 'string' ? body.title : '').replace(/[\r\n"\\/]+/g, ' ').trim().slice(0, 120) || 'document';

  // Images only from AE Hub's storage or inline; others are left out.
  const safe = html.replace(/<img\b[^>]*>/gi, tag => {
    const src = /\ssrc="([^"]*)"/i.exec(tag)?.[1]?.replace(/&amp;/g, '&') ?? '';
    return src.startsWith('data:image/') || hubFileUrl(src) ? tag : '';
  });

  try {
    const file = await HTMLtoDOCX(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${safe}</body></html>`, null, {
      orientation: body.orientation === 'landscape' ? 'landscape' : 'portrait',
      title,
      creator: 'AE Workstation',
      font: 'Arial',
      fontSize: 22,
      table: { row: { cantSplit: true } },
      imageProcessing: { downloadTimeout: 8000, maxImageSize: 8 * 1024 * 1024, suppressSharpWarning: true },
    });
    const bytes = file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array(file as ArrayBuffer);
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title.replace(/[^\x20-\x7e]/g, '_')}.docx"; filename*=UTF-8''${encodeURIComponent(title)}.docx`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[POST /api/documents/export]', err);
    return NextResponse.json({ error: 'The Word file could not be made.' }, { status: 500 });
  }
}
