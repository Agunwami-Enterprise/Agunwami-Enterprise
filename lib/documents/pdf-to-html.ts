/**
 * A PDF as editable HTML, for opening an uploaded PDF in the document editor.
 *
 * A PDF has no paragraphs or headings, only pieces of text placed on pages,
 * so they're rebuilt: pieces on the same line are joined, lines close
 * together become paragraphs, larger text becomes headings, "•" and "1."
 * lines become lists, and headers, footers and page numbers repeated on
 * every page are left out. Images, tables and the exact layout aren't kept
 * (the original PDF stays downloadable). Scanned PDFs, which are pictures
 * of text, have no text to edit.
 */

import { extractTextItems, getDocumentProxy, type StructuredTextItem } from 'unpdf';

export class ScannedPdfError extends Error {
  constructor() {
    super('This PDF has no text in it (it’s probably scanned pages, which are pictures), so it can’t become an editable document.');
  }
}

interface Line {
  text: string;
  /** Distance from the top of the document (pages stacked), in PDF units. */
  top: number;
  left: number;
  size: number;
  page: number;
  /** Text in columns (wide gaps between pieces): a table row. */
  cells: string[];
  /** Position on its page, for spotting headers and footers. */
  edge: 'top' | 'bottom' | null;
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const BULLET = /^\s*[•◦▪▫‣●○■□\-–—*·]\s+/;
const NUMBERED = /^\s*(\d{1,3}|[a-z]|[ivx]{1,5})[.)]\s+/i;
/** A header/footer, compared across pages with its numbers taken out ("Page 3 of 9"). */
const pattern = (text: string) => text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();

/** The pieces of text on one page as lines, top to bottom. */
function pageLines(items: StructuredTextItem[], page: number, pageTop: number, pageHeight: number): Line[] {
  const pieces = items.filter(i => i.str.trim() || i.hasEOL).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: StructuredTextItem[][] = [];
  for (const piece of pieces) {
    if (!piece.str.trim()) continue;
    // Same line: baselines within half a character of each other.
    const row = rows.find(r => Math.abs(r[0].y - piece.y) <= Math.max(2, Math.min(r[0].fontSize, piece.fontSize) * 0.5));
    if (row) row.push(piece);
    else rows.push([piece]);
  }
  return rows.map(row => {
    row.sort((a, b) => a.x - b.x);
    let text = '';
    let end = -Infinity;
    const cells: string[] = [''];
    for (const piece of row) {
      // A gap wider than a fraction of a character is a space (pieces often break mid-word);
      // one wider than a couple of characters separates columns.
      const gap = piece.x - end;
      if (text && gap > piece.fontSize * 2) cells.push('');
      const space = !!text && gap > piece.fontSize * 0.2 && !text.endsWith(' ') && !piece.str.startsWith(' ');
      if (space) text += ' ';
      if (space && cells.at(-1)) cells[cells.length - 1] += ' ';
      text += piece.str;
      cells[cells.length - 1] += piece.str;
      end = piece.x + piece.width;
    }
    const y = Math.max(...row.map(p => p.y));
    const fromTop = pageHeight - y;
    return {
      text: text.replace(/\s+/g, ' ').trim(),
      top: pageTop + fromTop,
      left: Math.min(...row.map(p => p.x)),
      size: Math.max(...row.map(p => p.fontSize)),
      page,
      cells: cells.length > 1 ? cells.map(c => c.replace(/\s+/g, ' ').trim()) : [],
      edge: fromTop < pageHeight * 0.08 ? 'top' : fromTop > pageHeight * 0.92 ? 'bottom' : null,
    } satisfies Line;
  }).filter(line => line.text);
}

/** The size most of the text is set in. */
function bodySize(lines: Line[]): number {
  const weight = new Map<number, number>();
  for (const line of lines) {
    const size = Math.round(line.size * 2) / 2;
    weight.set(size, (weight.get(size) ?? 0) + line.text.length);
  }
  return [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 12;
}

export async function pdfToHtml(data: Uint8Array): Promise<{ html: string; pages: number }> {
  const pdf = await getDocumentProxy(data);
  const { totalPages, items } = await extractTextItems(pdf);

  // Pages stacked top to bottom, so spacing between lines carries across pages.
  let offset = 0;
  const lines: Line[] = [];
  for (let page = 0; page < totalPages; page++) {
    const viewport = (await pdf.getPage(page + 1)).getViewport({ scale: 1 });
    lines.push(...pageLines(items[page] ?? [], page, offset, viewport.height));
    offset += viewport.height;
  }
  const characters = lines.reduce((n, l) => n + l.text.length, 0);
  // Only a PDF with no text at all is pictures of pages; any text (even a line) is shown.
  if (characters === 0) throw new ScannedPdfError();

  // Headers and footers: the same line at the top or bottom of most pages, and bare page numbers.
  const repeated = new Map<string, Set<number>>();
  for (const line of lines) {
    if (!line.edge) continue;
    const key = `${line.edge}:${pattern(line.text)}`;
    repeated.set(key, (repeated.get(key) ?? new Set()).add(line.page));
  }
  const isFurniture = (line: Line) => !!line.edge && (
    /^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i.test(line.text)
    || (totalPages >= 3 && (repeated.get(`${line.edge}:${pattern(line.text)}`)?.size ?? 0) >= totalPages * 0.6));
  const content = lines.filter(line => !isFurniture(line));

  const body = bodySize(content);
  // Usual distance between lines of a paragraph.
  const gaps = content.slice(1).map((line, i) => line.top - content[i].top).filter(g => g > 0 && g < body * 3).sort((a, b) => a - b);
  const lineGap = gaps[Math.floor(gaps.length / 2)] ?? body * 1.2;
  const leftEdge = Math.min(...content.map(l => l.left));

  const headingLevel = (line: Line) => (line.text.length > 140 ? 0 : line.size >= body * 1.6 ? 2 : line.size >= body * 1.25 ? 3 : 0);

  type Block = { kind: 'p' | 'h2' | 'h3' | 'ul' | 'ol' | 'table'; lines: string[]; rows?: string[][]; last: Line };
  const blocks: Block[] = [];
  for (const line of content) {
    const prev = blocks.at(-1);
    const gap = prev ? line.top - prev.last.top : Infinity;
    // Rows of text in columns, one under another, make a table (the header row often has larger gaps).
    if (line.cells.length >= 2) {
      const table = prev?.kind === 'table' && gap <= lineGap * 2.5 ? prev : null;
      if (table) table.rows!.push(line.cells);
      else blocks.push({ kind: 'table', lines: [], rows: [line.cells], last: line });
      blocks.at(-1)!.last = line;
      continue;
    }
    // A table cell's text wrapping onto the next line belongs to the table's last row.
    if (prev?.kind === 'table' && gap <= lineGap * 1.2 && line.left > leftEdge + body) {
      const row = prev.rows!.at(-1)!;
      row[row.length - 1] += ` ${line.text}`;
      prev.last = line;
      continue;
    }
    const level = headingLevel(line);
    const bullet = BULLET.test(line.text) ? 'ul' : NUMBERED.test(line.text) && line.text.length > 3 ? 'ol' : null;

    if (level) {
      // A heading that runs onto a second line continues it.
      if (prev && prev.kind === `h${level}` && gap <= line.size * 1.6) prev.lines[prev.lines.length - 1] += ` ${line.text}`;
      else blocks.push({ kind: `h${level}` as 'h2' | 'h3', lines: [line.text], last: line });
      if (blocks.at(-1)) blocks.at(-1)!.last = line;
      continue;
    }
    if (bullet) {
      const text = line.text.replace(bullet === 'ul' ? BULLET : NUMBERED, '');
      if (prev && prev.kind === bullet && gap <= lineGap * 2.2) prev.lines.push(text);
      else blocks.push({ kind: bullet, lines: [text], last: line });
      blocks.at(-1)!.last = line;
      continue;
    }
    const continues = prev && gap <= lineGap * 1.45
      // A list item's text wrapping onto an indented next line.
      && (prev.kind === 'p' || ((prev.kind === 'ul' || prev.kind === 'ol') && line.left > leftEdge + body));
    // A paragraph carried over to the next page (no full stop, next line starts in lower case).
    const overPage = prev && prev.kind === 'p' && line.page !== prev.last.page && !/[.!?:]["')\]]?$/.test(prev.last.text) && /^[a-z]/.test(line.text);
    if (prev && (continues || overPage)) {
      const last = prev.lines.length - 1;
      const current = prev.lines[last];
      // Words split with a hyphen at the end of a line are joined back up.
      prev.lines[last] = /[a-z]-$/.test(current) && /^[a-z]/.test(line.text) ? current.slice(0, -1) + line.text : `${current} ${line.text}`;
      prev.last = line;
      continue;
    }
    blocks.push({ kind: 'p', lines: [line.text], last: line });
  }

  const html = blocks.map(block => {
    if (block.kind === 'table') {
      const width = Math.max(...block.rows!.map(r => r.length));
      const rows = block.rows!.map(r => [...r, ...Array(width - r.length).fill('')]);
      return `<table><tbody>${rows.map(r => `<tr>${r.map(c => `<td><p>${escapeHtml(c)}</p></td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    if (block.kind === 'ul' || block.kind === 'ol') {
      return `<${block.kind}>${block.lines.map(text => `<li><p>${escapeHtml(text)}</p></li>`).join('')}</${block.kind}>`;
    }
    return `<${block.kind}>${escapeHtml(block.lines.join(' '))}</${block.kind}>`;
  }).join('');
  return { html: html || '<p></p>', pages: totalPages };
}
