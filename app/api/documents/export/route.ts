/**
 * POST /api/documents/export { html, title, orientation, letterhead? } → a Word file (.docx)
 *
 * A document from the editor as a real Word document. Images are only kept
 * from AE Hub's storage (or inline), so the server never fetches an
 * arbitrary address on someone's behalf. A letterhead (a page design in AE
 * Hub's storage) goes in the page header as a full-page picture behind the
 * text, so it's on every page, with margins that keep its header and footer clear.
 */

import { NextResponse } from 'next/server';
import HTMLtoDOCX from '@turbodocx/html-to-docx';
import { requireSession } from '@/lib/workstation/api-auth';
import { hubFileUrl } from '@/lib/documents/hub-storage';
import { anchorHeaderPictures } from '@/lib/documents/docx-letterhead';

const MAX_BYTES = 2 * 1024 * 1024;
/** Twips (Word's unit) per inch, and the side margins used with a letterhead (three quarters of an inch). */
const TWIPS = 1440;
const SIDE_MARGIN = 1080;

/** A letterhead whose picture is in AE Hub's storage, or null. */
function letterheadOf(value: unknown): { src: string; top: number; bottom: number } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const share = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(0.45, Math.max(0, n)) : null);
  const top = share(v.top);
  const bottom = share(v.bottom);
  if (typeof v.src !== 'string' || !hubFileUrl(v.src) || top === null || bottom === null) return null;
  return { src: v.src, top, bottom };
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({})) as { html?: unknown; title?: unknown; orientation?: unknown; letterhead?: unknown };
  const html = typeof body.html === 'string' ? body.html : '';
  if (!html || Buffer.byteLength(html) > MAX_BYTES) return NextResponse.json({ error: 'This document can’t be exported.' }, { status: 400 });
  const title = (typeof body.title === 'string' ? body.title : '').replace(/[\r\n"\\/]+/g, ' ').trim().slice(0, 120) || 'document';

  // Images only from AE Hub's storage or inline; others are left out. One that kept its size from a
  // file (style="width: 30%", data-align) gets that share of the text column in pixels (Word reads a
  // percentage as one of the picture's own size) and a paragraph aligned like it.
  const landscape = body.orientation === 'landscape';
  const letterhead = letterheadOf(body.letterhead);
  // The text column at 96 px per inch: 9in / 6.5in between 1in margins, 9.5in / 7in between a letterhead's.
  const column = letterhead ? (landscape ? 912 : 672) : (landscape ? 864 : 624);
  const safe = html.replace(/<img\b[^>]*>/gi, tag => {
    const src = /\ssrc="([^"]*)"/i.exec(tag)?.[1]?.replace(/&amp;/g, '&') ?? '';
    if (!src.startsWith('data:image/') && !hubFileUrl(src)) return '';
    const percent = /\sstyle="[^"]*\bwidth:\s*(\d+(?:\.\d+)?)%/i.exec(tag)?.[1];
    const sized = percent ? tag.replace(/\sstyle="[^"]*"/i, ` style="width: ${Math.round((Number(percent) / 100) * column)}px"`) : tag;
    const align = /\sdata-align="(center|right)"/i.exec(tag)?.[1];
    return align ? `<p style="text-align: ${align}">${sized}</p>` : sized;
  });

  try {
    const [pageW, pageH] = landscape ? [11, 8.5] : [8.5, 11];
    const header = letterhead ? `<p><img src="${escapeAttr(letterhead.src)}" style="width: ${pageW * 96}px; height: ${pageH * 96}px"></p>` : null;
    const file = await HTMLtoDOCX(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${safe}</body></html>`, header, {
      orientation: landscape ? 'landscape' : 'portrait',
      ...(letterhead ? {
        header: true,
        headerType: 'default',
        // The header itself sits at the very top (1 twip: 0 counts as unset), its picture covering the page.
        margins: {
          top: Math.round(letterhead.top * pageH * TWIPS), bottom: Math.round(letterhead.bottom * pageH * TWIPS),
          left: SIDE_MARGIN, right: SIDE_MARGIN, header: 1, footer: 1, gutter: 0,
        },
      } : {}),
      title,
      creator: 'AE Workstation',
      font: 'Arial',
      fontSize: 22,
      table: { row: { cantSplit: true } },
      imageProcessing: { downloadTimeout: 8000, maxImageSize: 8 * 1024 * 1024, suppressSharpWarning: true },
    });
    const made = file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array(file as ArrayBuffer);
    const bytes = new Uint8Array(letterhead ? await anchorHeaderPictures(made) : made);
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
