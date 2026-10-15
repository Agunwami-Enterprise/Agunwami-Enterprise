/**
 * A PDF page's design as a picture, for a letterhead or template: everything
 * drawn on the page except its text (header and footer bands, logos,
 * watermarks, shapes), so the text can be edited on top of it. Shown behind
 * every page of the document, like Word's and Google Docs' letterheads.
 *
 * The text is made invisible in a copy of the PDF (text rendering mode 3 in
 * every text object), then the page is drawn with pdf.js. Also worked out:
 * where the header ends and the footer starts, so typing starts below the one
 * and stops above the other.
 */

import { PDFDocument, PDFName, PDFRawStream, PDFRef, PDFArray, decodePDFRawStream, type PDFDict } from 'pdf-lib';
import { createIsomorphicCanvasFactory, getDocumentProxy } from 'unpdf';

export interface PdfBackground {
  /** The page's design (PNG, as a data: address). */
  src: string;
  /** Typing area: space kept clear at the top and bottom, as shares of the page's height. */
  top: number;
  bottom: number;
  landscape: boolean;
}

/** A rectangle on a page, in PDF units from its top-left corner. */
export interface Box { left: number; right: number; top: number; bottom: number }

/** Page 1: its size, and where its lines of text and its pictures are. */
export interface FirstPage { width: number; height: number; lines: Box[]; pictures: Box[] }

/** The background, and which of page 1's lines and pictures are part of it (by index). */
export interface BackgroundResult { background: PdfBackground; lines: Set<number>; pictures: Set<number> }

/** The picture's width, in pixels: sharp on a page shown about 860 pixels wide on a high-density screen. */
const RENDER_WIDTH = 1600;
/** Space between the header and the text, and the text and the footer, in PDF units (a quarter inch). */
const BREATHING = 18;
/** Dark marks this close to the body text (PDF units) are the text's own, like table borders. */
const AROUND_TEXT = 14;
/** Less ink than this share of the page isn't a design. */
const MIN_DESIGN = 0.0005;
/** Margins used when the design has no header or footer: about two thirds of an inch. */
const DEFAULT_MARGIN = 0.06;

/** Ink: a pixel that isn't (nearly) white or see-through. */
const isInk = (d: Uint8ClampedArray, i: number) => d[i + 3] > 24 && Math.min(d[i], d[i + 1], d[i + 2]) < 245;
/** Faint ink (a watermark's), kept behind text; darker marks in the text are the text's own (table lines, pictures). */
const isFaint = (d: Uint8ClampedArray, i: number) => Math.min(d[i], d[i + 1], d[i + 2]) >= 200;

/** Text rendering mode for each mode a stream sets: invisible (3), or invisible and clipping (7). */
const hiddenMode = (mode: string) => (Number(mode) >= 4 ? '7' : '3');

/** A content stream with its text made invisible: every text object starts invisible and stays so. */
function hideText(content: Uint8Array): Uint8Array {
  const text = Buffer.from(content).toString('latin1')
    .replace(/(^|[\s\]>)])([0-7])(\s+Tr)(?=[\s/[(<]|$)/g, (_m, before: string, mode: string, op: string) => `${before}${hiddenMode(mode)}${op}`)
    .replace(/(^|[\s\]>)])BT(?=[\s/[(<]|$)/g, '$1BT 3 Tr');
  return new Uint8Array(Buffer.from(text, 'latin1'));
}

/** A copy of the PDF with all its text invisible (pages and the drawings they place). */
async function withoutText(data: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data, { ignoreEncryption: true, updateMetadata: false });
  const { context } = doc;
  const streams = new Set<PDFRef>();
  for (const page of doc.getPages()) {
    const contents = page.node.get(PDFName.of('Contents'));
    if (contents instanceof PDFRef) streams.add(contents);
    else if (contents instanceof PDFArray) for (const item of contents.asArray()) if (item instanceof PDFRef) streams.add(item);
  }
  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Form')) streams.add(ref);
  }
  for (const ref of streams) {
    const stream = context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    let content: Uint8Array;
    try { content = decodePDFRawStream(stream).decode(); } catch { continue; }
    const dict = stream.dict.clone(context) as PDFDict;
    dict.delete(PDFName.of('Filter'));
    dict.delete(PDFName.of('DecodeParms'));
    context.assign(ref, PDFRawStream.of(dict, hideText(content)));
  }
  return doc.save({ useObjectStreams: false });
}

/** First and last rows with ink in a band of rows, scanning from `from` towards `to`, stopping at a gap of `gap` empty rows. */
function inkBand(rows: boolean[], from: number, to: number, gap: number): { start: number; end: number } | null {
  const step = to >= from ? 1 : -1;
  let start = -1;
  let end = -1;
  let empty = 0;
  for (let y = from; step > 0 ? y <= to : y >= to; y += step) {
    if (rows[y]) {
      if (start < 0) start = y;
      end = y;
      empty = 0;
    } else if (start >= 0 && ++empty >= gap) break;
  }
  return start < 0 ? null : { start, end };
}

/** The bits of a canvas used here (pdf.js's Node canvas is @napi-rs/canvas). */
interface Pixels { data: Uint8ClampedArray }
interface Drawing2D { getImageData(x: number, y: number, w: number, h: number): Pixels; putImageData(image: Pixels, x: number, y: number): void }

/** Page 1 drawn at RENDER_WIDTH, its text shown or not. */
async function drawPage(data: Uint8Array) {
  const CanvasFactory = await createIsomorphicCanvasFactory(() => import('@napi-rs/canvas'));
  const pdf = await getDocumentProxy(data, { CanvasFactory });
  try {
    const page = await pdf.getPage(1);
    const scale = RENDER_WIDTH / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });
    const factory = new CanvasFactory();
    const drawing = factory.create(Math.round(viewport.width), Math.round(viewport.height));
    await page.render({ canvas: drawing.canvas, canvasContext: drawing.context, viewport, background: 'rgba(0,0,0,0)' } as Parameters<typeof page.render>[0]).promise;
    const { width, height } = drawing.canvas as { width: number; height: number };
    return { canvas: drawing.canvas as unknown as { encode: (type: 'png') => Promise<Buffer> }, context: drawing.context as unknown as Drawing2D, width, height, scale };
  } finally {
    await (pdf as unknown as { destroy?: () => Promise<void> }).destroy?.();
  }
}

/**
 * Page 1's design as a background, or null if it has none (plain text on a
 * white page). Lines of text in its header or footer band are kept in the
 * picture (and are the letterhead's, not the document's); so are pictures
 * that aren't in the text column on their own (logos in the header, a
 * watermark behind the text). Dark marks among the body text (table lines)
 * and the pictures placed in the text are left out.
 */
export async function pdfBackground(data: Uint8Array, first: FirstPage): Promise<BackgroundResult | null> {
  let hidden: Uint8Array | null = null;
  try {
    hidden = await withoutText(data);
  } catch {
    // The text can't be hidden (an unusual or protected file): only a page without text can be used as it is.
    if (first.lines.length) return null;
  }
  const page = await drawPage(hidden ?? data.slice());
  const { context, width, height, scale } = page;
  const image = context.getImageData(0, 0, width, height);
  const px = image.data;
  const toPx = (v: number) => Math.round(v * scale);
  const rowsWithInk = () => {
    const rows: boolean[] = [];
    for (let y = 0; y < height; y++) {
      let ink = false;
      for (let x = 0; x < width && !ink; x++) ink = isInk(px, (y * width + x) * 4);
      rows.push(ink);
    }
    return rows;
  };

  // The header: ink from the top of the page down to the first wide gap, if it starts near the top and
  // isn't most of the page; the footer likewise from the bottom (in PDF units).
  const gap = Math.round(height * 0.02);
  const rows = rowsWithInk();
  const top = inkBand(rows, 0, height - 1, gap);
  const bottom = inkBand(rows, height - 1, 0, gap);
  const header = top && top.start < height * 0.2 && top.end < height * 0.4 ? top.end / scale : null;
  const footer = bottom && bottom.start > height * 0.8 && bottom.end > height * 0.6 ? bottom.end / scale : null;

  const middle = (b: Box) => (b.top + b.bottom) / 2;
  const inBands = (b: Box) => (header !== null && middle(b) <= header) || (footer !== null && middle(b) >= footer);
  const lines = new Set(first.lines.flatMap((b, i) => (inBands(b) ? [i] : [])));
  const body = first.lines.filter((_, i) => !lines.has(i));
  const text = body.length ? {
    left: Math.min(...body.map(b => b.left)),
    right: Math.max(...body.map(b => b.right)),
    top: Math.min(...body.map(b => b.top)),
    bottom: Math.max(...body.map(b => b.bottom)),
  } : null;
  // The text column: the body's left margin, and the same on the right (or the body's own right edge).
  const column = text ? { left: text.left - 6, right: Math.max(text.right, first.width - text.left) + 6 } : null;
  const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  // A picture placed in the text: in the column, between the header and the footer, clear of the text.
  const inline = (b: Box) => !!column && b.left >= column.left && b.right <= column.right
    && (header === null || b.top > header) && (footer === null || b.bottom < footer)
    && !body.some(line => overlaps(line, b));
  const pictures = new Set(first.pictures.flatMap((b, i) => (inline(b) ? [] : [i])));

  const clear = (i: number) => { px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = 0; };
  for (const [i, b] of first.pictures.entries()) {
    if (pictures.has(i)) continue;
    for (let y = Math.max(0, toPx(b.top)); y < Math.min(height, toPx(b.bottom)); y++) {
      for (let x = Math.max(0, toPx(b.left)); x < Math.min(width, toPx(b.right)); x++) clear((y * width + x) * 4);
    }
  }
  if (text && column) {
    // A little around the text too: table borders sit just outside their cells' text.
    for (let y = Math.max(0, toPx(text.top - AROUND_TEXT)); y < Math.min(height, toPx(text.bottom + AROUND_TEXT)); y++) {
      for (let x = Math.max(0, toPx(column.left - AROUND_TEXT)); x < Math.min(width, toPx(column.right + AROUND_TEXT)); x++) {
        const i = (y * width + x) * 4;
        if (isInk(px, i) && !isFaint(px, i)) clear(i);
      }
    }
  }

  // The header's and footer's text, from the page drawn with its text.
  if (lines.size && hidden) {
    const shown = await drawPage(data.slice());
    const full = shown.context.getImageData(0, 0, width, height).data;
    for (const i of lines) {
      const b = first.lines[i];
      for (let y = Math.max(0, toPx(b.top) - 2); y < Math.min(height, toPx(b.bottom) + 2); y++) {
        for (let x = Math.max(0, toPx(b.left) - 2); x < Math.min(width, toPx(b.right) + 2); x++) {
          const k = (y * width + x) * 4;
          px[k] = full[k]; px[k + 1] = full[k + 1]; px[k + 2] = full[k + 2]; px[k + 3] = full[k + 3];
        }
      }
    }
  }

  // Nothing (or only specks) left: a plain page.
  let ink = 0;
  for (let i = 0; i < px.length; i += 4) if (isInk(px, i)) ink++;
  if (ink < width * height * MIN_DESIGN) return null;
  context.putImageData(image, 0, 0);

  const pad = BREATHING / first.height;
  let keepTop = header !== null ? header / first.height + pad : DEFAULT_MARGIN;
  const keepBottom = footer !== null ? 1 - footer / first.height + pad : DEFAULT_MARGIN;
  // The template's own text shows where typing is meant to start.
  if (text) keepTop = Math.max(keepTop, text.top / first.height - 0.01);
  const share = (v: number) => Math.round(Math.max(DEFAULT_MARGIN, Math.min(v, 0.45)) * 1000) / 1000;

  const png = await page.canvas.encode('png');
  return {
    background: {
      src: `data:image/png;base64,${png.toString('base64')}`,
      top: share(keepTop),
      bottom: share(keepBottom),
      landscape: first.width > first.height,
    },
    lines,
    pictures,
  };
}
