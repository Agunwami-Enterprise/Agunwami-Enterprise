/**
 * A PDF as editable HTML, for opening an uploaded PDF in the document editor.
 *
 * A PDF has no paragraphs or headings, only pieces of text placed on pages,
 * so they're rebuilt: pieces on the same line are joined, lines close
 * together become paragraphs, larger text becomes headings, "•" and "1."
 * lines become lists, and headers, footers and page numbers repeated on
 * every page are left out. Pictures (logos, photos, a letterhead) are kept
 * where they sit between the text, at their size on the page and aligned
 * left, centred or right, as inline images (data: addresses) that the editor
 * stores; a logo repeated on every page is kept once. The exact layout isn't
 * kept (the original PDF stays downloadable). Scanned pages come through as
 * pictures of the pages.
 */

import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { extractTextItems, getDocumentProxy, getResolvedPDFJS, type StructuredTextItem } from 'unpdf';
import { pdfBackground, type Box, type PdfBackground } from './pdf-background';

export class ScannedPdfError extends Error {
  constructor() {
    super('This PDF has no text or pictures in it that can be read, so it can’t become an editable document.');
  }
}

type Pdf = Awaited<ReturnType<typeof getDocumentProxy>>;
type Page = Awaited<ReturnType<Pdf['getPage']>>;
type Matrix = [number, number, number, number, number, number];

/** A decoded picture as pdf.js hands it over: raw pixels, by kind (1 bit grey, RGB or RGBA). */
interface RawImage { width?: number; height?: number; data?: Uint8Array | Uint8ClampedArray; kind?: number }

interface Picture {
  src: string;
  /** Distances from the top of the document (pages stacked), in PDF units, like lines. */
  top: number;
  bottom: number;
  page: number;
  /** Width as a share of the text column, and where it sits across the page. */
  percent: number;
  align: 'left' | 'center' | 'right';
}

/** Pictures smaller than this on the page (rules, bullets, specks) are left out. */
const MIN_PICTURE = 12;
/** At most this many pictures (what the editor stores), and this much picture data, per file. */
const MAX_PICTURES = 40;
const MAX_PICTURE_BYTES = 12 * 1024 * 1024;
/** Wider pictures are scaled down to this many pixels. */
const MAX_PICTURE_WIDTH = 1600;

/** pdf.js's matrix product: `m` applied after `n` (how a transform is added to the current one). */
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

/** A picture's pixels as a PNG (or a JPEG for large photos), or null if they can't be read. */
async function encodePicture(image: RawImage): Promise<{ src: string; hash: string } | null> {
  const { width = 0, height = 0, data, kind } = image;
  if (!data || !width || !height) return null;
  let pixels: Buffer;
  let channels: 1 | 3 | 4;
  if (kind === 1) {
    // One bit per pixel, rows padded to whole bytes; a set bit is white.
    const rowBytes = (width + 7) >> 3;
    if (data.length < rowBytes * height) return null;
    pixels = Buffer.alloc(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) pixels[y * width + x] = data[y * rowBytes + (x >> 3)] & (128 >> (x & 7)) ? 255 : 0;
    }
    channels = 1;
  } else {
    const n = kind === 3 ? 4 : kind === 2 ? 3 : data.length / (width * height);
    if (n !== 1 && n !== 3 && n !== 4) return null;
    if (data.length < width * height * n) return null;
    channels = n;
    pixels = Buffer.from(data.buffer, data.byteOffset, width * height * n);
  }
  let opaque = channels !== 4;
  if (channels === 4) {
    opaque = true;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) { opaque = false; break; }
  }
  const hash = createHash('sha1').update(`${width}x${height}:`).update(pixels).digest('hex');
  try {
    let picture = sharp(pixels, { raw: { width, height, channels } }).resize({ width: Math.min(width, MAX_PICTURE_WIDTH), withoutEnlargement: true });
    if (channels === 4 && opaque) picture = picture.removeAlpha();
    // Photos are smaller as JPEGs; logos, drawings and anything see-through stay sharp as PNGs.
    const photo = opaque && channels !== 1 && width * height > 250_000;
    const out = photo ? await picture.jpeg({ quality: 82, mozjpeg: true }).toBuffer() : await picture.png({ compressionLevel: 9 }).toBuffer();
    return { src: `data:image/${photo ? 'jpeg' : 'png'};base64,${out.toString('base64')}`, hash };
  } catch {
    return null;
  }
}

/** A picture object of a page, given up on after a few seconds. */
function pictureObject(page: Page, key: string): Promise<RawImage | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), 5000);
    try {
      (key.startsWith('g_') ? page.commonObjs : page.objs).get(key, (image: RawImage) => { clearTimeout(timer); resolve(image ?? null); });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

interface Placed { image: RawImage | string; box: Box }

/** The pictures drawn on a page and where (PDF units, from the page's top), following the drawing's transforms. */
async function placedPictures(page: Page, pageHeight: number): Promise<Placed[]> {
  const { OPS } = await getResolvedPDFJS();
  const ops = await page.getOperatorList();
  const placed: Placed[] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i] as unknown[];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform) ctm = multiply(ctm, args as Matrix);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push(ctm);
      if (Array.isArray(args[0]) && args[0].length === 6) ctm = multiply(ctm, args[0] as Matrix);
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
      // A picture fills the unit square, mapped onto the page by the current transform.
      const xs = [ctm[4], ctm[0] + ctm[4], ctm[2] + ctm[4], ctm[0] + ctm[2] + ctm[4]];
      const ys = [ctm[5], ctm[1] + ctm[5], ctm[3] + ctm[5], ctm[1] + ctm[3] + ctm[5]];
      const box = { left: Math.min(...xs), right: Math.max(...xs), top: pageHeight - Math.max(...ys), bottom: pageHeight - Math.min(...ys) };
      if (box.right - box.left < MIN_PICTURE || box.bottom - box.top < MIN_PICTURE) continue;
      const image = fn === OPS.paintImageXObject ? String(args[0]) : args[0] as RawImage;
      placed.push({ image, box });
    }
  }
  return placed;
}

interface Found { page: number; box: Box; src: string; hash: string }
type PageInfo = { top: number; width: number; height: number; hasText: boolean };

/** Every picture drawn in a PDF (but rules and specks), with where it sits on its page. */
async function findPictures(pdf: Pdf, pages: PageInfo[]): Promise<Found[]> {
  const found: Found[] = [];
  let bytes = 0;
  for (let index = 0; index < pages.length; index++) {
    const { width, height, hasText } = pages[index];
    const page = await pdf.getPage(index + 1);
    let placed: Placed[];
    try { placed = await placedPictures(page, height); } catch { continue; }
    placed.sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left);
    for (const { image, box } of placed) {
      if (found.length >= MAX_PICTURES * 2 || bytes > MAX_PICTURE_BYTES * 2) return found;
      // A picture behind a whole page of text is its background (kept only in a letterhead's).
      if (index > 0 && hasText && box.right - box.left > width * 0.9 && box.bottom - box.top > height * 0.9) continue;
      const raw = typeof image === 'string' ? await pictureObject(page, image) : image;
      const encoded = raw ? await encodePicture(raw) : null;
      if (!encoded) continue;
      found.push({ page: index, box, ...encoded });
      bytes += encoded.src.length;
    }
  }
  return found;
}

/** Pictures placed among the text: their size and alignment, in reading order (a logo in every page's header once). */
function layoutPictures(found: Found[], pages: PageInfo[], textLeft: number): Picture[] {
  const pictures: Picture[] = [];
  const seenAtEdge = new Set<string>();
  let bytes = 0;
  for (const { page, box, src, hash } of found) {
    if (pictures.length >= MAX_PICTURES || bytes > MAX_PICTURE_BYTES) break;
    const { top: pageTop, width, height, hasText } = pages[page];
    const w = box.right - box.left;
    if (hasText && w > width * 0.9 && box.bottom - box.top > height * 0.9) continue;
    const edge = box.top < height * 0.15 || box.bottom > height * 0.85;
    if (edge && seenAtEdge.has(hash)) continue;
    if (edge) seenAtEdge.add(hash);
    // The text column: between the text's left margin and the same margin on the right.
    const margin = Number.isFinite(textLeft) && textLeft < width / 3 ? textLeft : width * 0.1;
    const column = Math.max(width - margin * 2, width * 0.5);
    const centre = (box.left + box.right) / 2;
    const percent = Math.max(5, Math.min(100, Math.round((w / column) * 100)));
    pictures.push({
      src,
      top: pageTop + box.top,
      bottom: pageTop + box.bottom,
      page,
      percent,
      align: percent >= 100 || Math.abs(centre - width / 2) < width * 0.06 ? 'center' : box.left > width / 2 ? 'right' : 'left',
    });
    bytes += src.length;
  }
  return pictures;
}

interface Line {
  text: string;
  /** Distance from the top of the document (pages stacked), in PDF units. */
  top: number;
  left: number;
  right: number;
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
      right: end,
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

export async function pdfToHtml(data: Uint8Array): Promise<{ html: string; pages: number; background: PdfBackground | null }> {
  // pdf.js may take over the bytes it's given; the background is drawn from a copy.
  const copy = data.slice();
  const pdf = await getDocumentProxy(data);
  const { totalPages, items } = await extractTextItems(pdf);

  // Pages stacked top to bottom, so spacing between lines carries across pages.
  let offset = 0;
  let lines: Line[] = [];
  const pages: PageInfo[] = [];
  for (let page = 0; page < totalPages; page++) {
    const viewport = (await pdf.getPage(page + 1)).getViewport({ scale: 1 });
    const pageText = pageLines(items[page] ?? [], page, offset, viewport.height);
    lines.push(...pageText);
    pages.push({ top: offset, width: viewport.width, height: viewport.height, hasText: pageText.length > 0 });
    offset += viewport.height;
  }
  let found = await findPictures(pdf, pages);
  let characters = lines.reduce((n, l) => n + l.text.length, 0);

  // A letterhead or designed template: page 1's design (everything but its body text) goes behind every
  // page, with the text in its header and footer, and the pictures that are part of it. Not for scanned
  // documents (several pages of pictures and no text): those come through as pictures of the pages.
  let background: PdfBackground | null = null;
  if (characters > 0 || totalPages === 1) {
    const firstLines = lines.filter(l => l.page === 0);
    const firstPictures = found.filter(f => f.page === 0);
    try {
      const result = await pdfBackground(copy, {
        width: pages[0].width,
        height: pages[0].height,
        lines: firstLines.map(l => ({ left: l.left, right: l.right, top: l.top - l.size, bottom: l.top + l.size * 0.3 })),
        pictures: firstPictures.map(f => f.box),
      });
      if (result) {
        background = result.background;
        const absorbed = firstLines.filter((_, i) => result.lines.has(i));
        // The header's and footer's text, on page 1 and repeated on later pages, is the letterhead's.
        const letterheadText = new Set(absorbed.map(l => pattern(l.text)));
        lines = lines.filter(l => !(l.page === 0 ? absorbed.includes(l) : letterheadText.has(pattern(l.text)) && (l.edge || l.top - pages[l.page].top < pages[l.page].height * background!.top)));
        // Its pictures, and the same pictures on later pages, are part of the background too.
        const inBackground = new Set(firstPictures.filter((_, i) => result.pictures.has(i)).map(f => f.hash));
        found = found.filter(f => !inBackground.has(f.hash));
        characters = lines.reduce((n, l) => n + l.text.length, 0);
      }
    } catch (err) {
      console.error('[pdfToHtml] the page design could not be drawn', err);
    }
  }
  const pictures = layoutPictures(found, pages, Math.min(...lines.map(l => l.left)));
  if (characters === 0 && pictures.length === 0 && !background) throw new ScannedPdfError();

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

  type Block = { kind: 'p' | 'h2' | 'h3' | 'ul' | 'ol' | 'table' | 'img'; lines: string[]; rows?: string[][]; picture?: Picture; last: Line };
  const blocks: Block[] = [];
  // Pictures go in before the first line below their middle; the text after one starts afresh.
  let nextPicture = 0;
  const placePictures = (before: number) => {
    while (nextPicture < pictures.length && (pictures[nextPicture].top + pictures[nextPicture].bottom) / 2 < before) {
      const picture = pictures[nextPicture++];
      blocks.push({ kind: 'img', lines: [], picture, last: { text: '', top: picture.bottom, left: 0, right: 0, size: body, page: picture.page, cells: [], edge: null } });
    }
  };
  for (const line of content) {
    placePictures(line.top);
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
    // (Lines further apart than about one and a half lines of text start a new paragraph, even when
    // every gap in the file is that wide: one-line paragraphs.)
    const continues = prev && gap <= Math.min(lineGap * 1.45, body * 1.8)
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

  placePictures(Infinity);

  const html = blocks.map(block => {
    if (block.kind === 'img') {
      const { src, percent, align } = block.picture!;
      return `<img src="${src}" alt="" style="width: ${percent}%" data-align="${align}">`;
    }
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
  return { html: html || '<p></p>', pages: totalPages, background };
}
