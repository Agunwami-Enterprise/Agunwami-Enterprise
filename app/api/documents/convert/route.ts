/**
 * POST /api/documents/convert { url, name }
 *
 * Turns an uploaded Word (.docx), text (.txt, .md) or web page (.html) file
 * into HTML for the document editor, so an uploaded document can be edited.
 * Runs here because AE Hub's storage doesn't let the browser read files
 * directly. Only files in AE Hub's own storage are fetched. Images in Word
 * files come back inline (data: addresses); the editor stores them.
 */

import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { requireSession } from '@/lib/workstation/api-auth';

const MAX_BYTES = 25 * 1024 * 1024;
const BUCKET = process.env.NEXT_PUBLIC_WORKSTATION_FIREBASE_STORAGE_BUCKET || 'aehub-eafa6.firebasestorage.app';

// Keep in step with EDITABLE_FILE_TYPES in modules/documents/doc-store.ts.
const EDITABLE_EXTENSIONS = ['docx', 'txt', 'md', 'html', 'htm'];

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Plain text (and simple Markdown headings and bullets) as paragraphs. */
function textToHtml(text: string): string {
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  return blocks.map(block => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(block);
    if (heading && !block.includes('\n')) return `<h${heading[1].length + 1}>${escapeHtml(heading[2])}</h${heading[1].length + 1}>`;
    const lines = block.split('\n');
    if (lines.every(l => /^\s*[-*]\s+/.test(l))) return `<ul>${lines.map(l => `<li><p>${escapeHtml(l.replace(/^\s*[-*]\s+/, ''))}</p></li>`).join('')}</ul>`;
    return `<p>${lines.map(escapeHtml).join('<br>')}</p>`;
  }).join('') || '<p></p>';
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({})) as { url?: unknown; name?: unknown };
  const url = typeof body.url === 'string' ? body.url : '';
  const name = typeof body.name === 'string' ? body.name : '';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (!EDITABLE_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: 'Only Word (.docx), text (.txt, .md) and web page (.html) files can be edited. Download other files instead.' }, { status: 400 });
  }
  // Only AE Hub's own storage, never an arbitrary address.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'That file’s address isn’t valid.' }, { status: 400 });
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'firebasestorage.googleapis.com' || !parsed.pathname.startsWith(`/v0/b/${BUCKET}/o/`)) {
    return NextResponse.json({ error: 'Only files uploaded to Documents can be edited.' }, { status: 400 });
  }

  try {
    const res = await fetch(parsed, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'The file could not be read.' }, { status: 502 });
    const size = Number(res.headers.get('content-length') ?? 0);
    if (size > MAX_BYTES) return NextResponse.json({ error: 'The file is too large to edit (over 25 MB).' }, { status: 413 });
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_BYTES) return NextResponse.json({ error: 'The file is too large to edit (over 25 MB).' }, { status: 413 });

    if (ext === 'docx') {
      const result = await mammoth.convertToHtml({ buffer });
      return NextResponse.json({ html: result.value || '<p></p>', warnings: result.messages.filter(m => m.type === 'warning').length });
    }
    const text = buffer.toString('utf-8');
    return NextResponse.json({ html: ext === 'html' || ext === 'htm' ? text : textToHtml(text), warnings: 0 });
  } catch (err) {
    console.error('[POST /api/documents/convert]', err);
    return NextResponse.json({ error: 'The file could not be opened for editing. It may be damaged or password-protected.' }, { status: 422 });
  }
}
