/**
 * POST /api/documents/convert { url, name } | form data "file"
 *
 * Turns a Word (.docx), PDF, text (.txt, .md) or web page (.html) file into
 * HTML for the document editor: an uploaded document being shown or edited
 * (fetched from AE Hub's storage, which the browser can't read directly; only
 * AE Hub's own storage is fetched), or a file sent with the request (a
 * template being added). Images in Word and PDF files come back inline (data:
 * addresses); the editor stores them.
 */

import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { requireSession } from '@/lib/workstation/api-auth';
import { readSource } from '@/lib/documents/read-source';
import { ScannedPdfError, pdfToHtml } from '@/lib/documents/pdf-to-html';

// Keep in step with EDITABLE_FILE_TYPES in modules/documents/doc-store.ts.
const EDITABLE_EXTENSIONS = ['docx', 'pdf', 'txt', 'md', 'html', 'htm'];

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

  const source = await readSource(request);
  if (source instanceof NextResponse) return source;
  const { buffer, ext } = source;
  if (!EDITABLE_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: 'Only Word (.docx), PDF, text (.txt, .md) and web page (.html) files can be opened as documents.' }, { status: 400 });
  }

  try {
    if (ext === 'docx') {
      const result = await mammoth.convertToHtml({ buffer });
      return NextResponse.json({ html: result.value || '<p></p>', warnings: result.messages.filter(m => m.type === 'warning').length });
    }
    if (ext === 'pdf') {
      const { html } = await pdfToHtml(new Uint8Array(buffer));
      return NextResponse.json({ html, warnings: 0 });
    }
    const text = buffer.toString('utf-8');
    return NextResponse.json({ html: ext === 'html' || ext === 'htm' ? text : textToHtml(text), warnings: 0 });
  } catch (err) {
    if (err instanceof ScannedPdfError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error('[POST /api/documents/convert]', err);
    return NextResponse.json({ error: 'The file could not be opened. It may be damaged or password-protected.' }, { status: 422 });
  }
}
