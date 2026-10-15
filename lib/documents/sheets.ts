/**
 * Spreadsheets in Documents: the built-in spreadsheet (Fortune-sheet) and
 * Excel/CSV files, converted both ways with ExcelJS.
 *
 * A spreadsheet is stored as its sheets in Fortune-sheet's own shape, kept
 * compact: each sheet's cells as a list (`celldata`), never the full grid.
 * Kept from Excel and back: values, formulas, number formats, fonts, fills,
 * alignment, wrapping, merged cells, borders, column widths, row heights and
 * frozen rows/columns. Not kept: charts, images, conditional formatting,
 * data validation, comments and pivot tables.
 *
 * Plain functions, no browser or server specifics: the server reads uploaded
 * files with them and the browser writes downloads.
 */

import type { Cell, CellWithRowAndCol, Sheet } from '@fortune-sheet/core';
import type ExcelJS from 'exceljs';

export type StoredSheet = Pick<Sheet, 'name' | 'id' | 'order' | 'color' | 'config' | 'frozen' | 'row' | 'column' | 'zoomRatio' | 'calcChain' | 'hide' | 'hyperlink'> & {
  celldata: CellWithRowAndCol[];
};

/** Up to this many filled cells are read from a file (a guard against huge workbooks). */
export const MAX_CELLS = 150_000;

export const SHEET_FILE_TYPES = ['xlsx', 'csv'];

// ── Fortune-sheet ⇄ storage ─────────────────────────────────────────────────

/** Sheets as Fortune-sheet hands them over (with the full grid) → compact, for saving. */
export function compactSheets(sheets: Sheet[]): StoredSheet[] {
  return sheets.map((sheet, order) => {
    const celldata: CellWithRowAndCol[] = [];
    if (sheet.data) {
      sheet.data.forEach((row, r) => row?.forEach((cell, c) => { if (cell != null && Object.keys(cell).length) celldata.push({ r, c, v: cell }); }));
    } else if (sheet.celldata) {
      celldata.push(...sheet.celldata.filter(cell => cell.v != null));
    }
    const stored: StoredSheet = { name: sheet.name, id: sheet.id, order: sheet.order ?? order, celldata };
    if (sheet.color) stored.color = sheet.color;
    if (sheet.config && Object.keys(sheet.config).length) stored.config = sheet.config;
    if (sheet.frozen) stored.frozen = sheet.frozen;
    if (sheet.row) stored.row = sheet.row;
    if (sheet.column) stored.column = sheet.column;
    if (sheet.zoomRatio && sheet.zoomRatio !== 1) stored.zoomRatio = sheet.zoomRatio;
    if (sheet.calcChain?.length) stored.calcChain = sheet.calcChain;
    if (sheet.hide) stored.hide = sheet.hide;
    if (sheet.hyperlink && Object.keys(sheet.hyperlink).length) stored.hyperlink = sheet.hyperlink;
    return stored;
  });
}

/**
 * Sheets ready for the grid: each with an id, and its formula cells listed in
 * its calculation chain (which is what the grid recalculates; sheets from
 * templates and Excel files arrive without one).
 */
export function prepareSheets(sheets: StoredSheet[]): Sheet[] {
  return sheets.map((sheet, i) => {
    const id = sheet.id || `sheet-${i + 1}`;
    const calcChain = sheet.celldata.filter(cell => cell.v?.f).map(cell => ({ r: cell.r, c: cell.c, id }));
    return { ...structuredClone(sheet), id, calcChain } as Sheet;
  });
}

/** A new, empty sheet. */
export const blankSheet = (name = 'Sheet1'): StoredSheet => ({ name, order: 0, celldata: [] });

/** Stored sheets, read back (anything unreadable becomes one blank sheet). */
export function parseSheets(json: string): StoredSheet[] {
  try {
    const sheets = JSON.parse(json) as unknown;
    if (Array.isArray(sheets) && sheets.length && sheets.every(s => s && typeof s === 'object' && typeof (s as Sheet).name === 'string')) {
      return (sheets as StoredSheet[]).map(s => ({ ...s, celldata: Array.isArray(s.celldata) ? s.celldata : [] }));
    }
  } catch {
    // Fall through to a blank sheet.
  }
  return [blankSheet()];
}

/** A cell's text as shown (its formatted value, else its value). */
export function cellText(cell: Cell | null | undefined): string {
  if (!cell) return '';
  const shown = cell.m ?? cell.v;
  if (shown == null) return '';
  if (typeof shown === 'object') return '';
  return String(shown);
}

// ── CSV ─────────────────────────────────────────────────────────────────────

/** CSV rows (quoted fields, commas and new lines inside quotes). Semicolon-separated files too. */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '');
  const firstLine = source.slice(0, source.indexOf('\n') + 1 || undefined);
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === sep) { row.push(field); field = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const NUMBER = /^-?(\d+|\d{1,3}(,\d{3})+)(\.\d+)?$/;

export function csvToSheets(text: string, name = 'Sheet1'): StoredSheet[] {
  const celldata: CellWithRowAndCol[] = [];
  parseCsv(text).forEach((row, r) => row.forEach((value, c) => {
    if (value === '' || celldata.length >= MAX_CELLS) return;
    const trimmed = value.trim();
    if (NUMBER.test(trimmed)) {
      const n = Number(trimmed.replace(/,/g, ''));
      celldata.push({ r, c, v: { v: n, m: trimmed, ct: { fa: 'General', t: 'n' } } });
    } else celldata.push({ r, c, v: { v: value, m: value, ct: { fa: 'General', t: 'g' } } });
  }));
  return [{ ...blankSheet(name), celldata }];
}

const csvField = (text: string) => (/[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

/** One sheet as CSV (values as shown). */
export function sheetToCsv(sheet: StoredSheet): string {
  const rows: string[][] = [];
  for (const { r, c, v } of sheet.celldata) {
    if (v?.mc && (v.mc.r !== r || v.mc.c !== c)) continue;
    (rows[r] ??= [])[c] = cellText(v);
  }
  const width = Math.max(0, ...rows.filter(Boolean).map(row => row.length));
  return Array.from(rows, row => Array.from({ length: width }, (_, c) => csvField(row?.[c] ?? '')).join(',')).join('\r\n');
}

// ── Excel ⇄ sheets ──────────────────────────────────────────────────────────

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const toSerial = (date: Date) => (date.getTime() - EXCEL_EPOCH) / 86_400_000;
const fromSerial = (serial: number) => new Date(EXCEL_EPOCH + serial * 86_400_000);

const argbToHex = (argb: string | undefined) => (argb && /^[0-9a-f]{8}$/i.test(argb) ? `#${argb.slice(2).toLowerCase()}` : argb && /^[0-9a-f]{6}$/i.test(argb) ? `#${argb.toLowerCase()}` : undefined);
const hexToArgb = (hex: string | undefined) => {
  const m = hex && /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (m) return `FF${m[1].toUpperCase()}`;
  const rgb = hex && /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(hex);
  return rgb ? `FF${[rgb[1], rgb[2], rgb[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()}` : undefined;
};

const BORDER_STYLES = ['', 'thin', 'hair', 'dotted', 'dashed', 'dashDot', 'dashDotDot', 'double', 'medium', 'mediumDashed', 'mediumDashDot', 'mediumDashDotDot', 'slantDashDot', 'thick'] as const;
const borderFrom = (edge: Partial<ExcelJS.Border> | undefined) => (edge?.style
  ? { style: Math.max(1, BORDER_STYLES.indexOf(edge.style as (typeof BORDER_STYLES)[number])), color: argbToHex(edge.color?.argb) ?? '#000000' }
  : null);
const borderTo = (edge: { style?: number; color?: string } | null | undefined): Partial<ExcelJS.Border> | undefined => (edge?.style
  ? { style: (BORDER_STYLES[edge.style] || 'thin') as ExcelJS.BorderStyle, color: { argb: hexToArgb(edge.color) ?? 'FF000000' } }
  : undefined);

/** "B3" → row/column (0-based). */
function address(ref: string): { r: number; c: number } {
  const m = /^([A-Z]+)(\d+)$/i.exec(ref.replace(/\$/g, ''));
  if (!m) return { r: 0, c: 0 };
  const c = m[1].toUpperCase().split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { r: Number(m[2]) - 1, c };
}

/** An Excel cell → a Fortune-sheet cell (value, formula, format and style). */
function cellFromExcel(cell: ExcelJS.Cell): Cell | null {
  const out: Cell = {};
  let value: unknown = cell.value;
  const numFmt = cell.numFmt || 'General';
  if (cell.formula) {
    out.f = `=${cell.formula}`;
    value = cell.result;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const v = value as { richText?: { text: string }[]; text?: unknown; error?: string; result?: unknown };
    value = v.richText ? v.richText.map(t => t.text).join('') : v.error ?? (typeof v.text === 'string' ? v.text : v.result ?? '');
  }
  if (value instanceof Date) {
    out.v = toSerial(value);
    out.m = value.toISOString().slice(0, 10);
    out.ct = { fa: numFmt === 'General' ? 'yyyy-mm-dd' : numFmt, t: 'd' };
  } else if (typeof value === 'number') {
    out.v = value;
    out.m = cell.text || String(value);
    out.ct = { fa: numFmt, t: 'n' };
  } else if (typeof value === 'boolean') {
    out.v = value ? 'TRUE' : 'FALSE';
    out.m = out.v;
    out.ct = { fa: 'General', t: 'b' };
  } else if (value != null && value !== '') {
    out.v = String(value);
    out.m = out.v;
    out.ct = { fa: 'General', t: 'g' };
  }

  const font = cell.font ?? {};
  if (font.bold) out.bl = 1;
  if (font.italic) out.it = 1;
  if (font.underline) out.un = 1;
  if (font.strike) out.cl = 1;
  if (font.size && font.size !== 11) out.fs = font.size;
  if (font.name && font.name !== 'Calibri') out.ff = font.name;
  const fc = argbToHex(font.color?.argb);
  if (fc && fc !== '#000000') out.fc = fc;
  const fill = cell.fill as ExcelJS.FillPattern | undefined;
  const bg = fill?.type === 'pattern' && fill.pattern === 'solid' ? argbToHex(fill.fgColor?.argb) : undefined;
  if (bg) out.bg = bg;
  const align = cell.alignment ?? {};
  if (align.horizontal === 'center' || align.horizontal === 'centerContinuous') out.ht = 0;
  else if (align.horizontal === 'left') out.ht = 1;
  else if (align.horizontal === 'right') out.ht = 2;
  if (align.vertical === 'middle') out.vt = 0;
  else if (align.vertical === 'top') out.vt = 1;
  else if (align.vertical === 'bottom') out.vt = 2;
  if (align.wrapText) out.tb = '2';
  return Object.keys(out).length ? out : null;
}

/** An Excel workbook → sheets. */
export function workbookToSheets(workbook: ExcelJS.Workbook): StoredSheet[] {
  let cells = 0;
  const sheets: StoredSheet[] = [];
  workbook.eachSheet(ws => {
    if (ws.state === 'veryHidden') return;
    const celldata: CellWithRowAndCol[] = [];
    const borderInfo: unknown[] = [];
    let maxRow = 0;
    let maxCol = 0;
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (cells >= MAX_CELLS) return;
        const r = rowNumber - 1;
        const c = colNumber - 1;
        const border = cell.border;
        if (border && (border.top || border.bottom || border.left || border.right)) {
          borderInfo.push({ rangeType: 'cell', value: { row_index: r, col_index: c, l: borderFrom(border.left), r: borderFrom(border.right), t: borderFrom(border.top), b: borderFrom(border.bottom) } });
        }
        if (cell.isMerged && cell.master !== cell) return;
        const v = cellFromExcel(cell);
        if (!v) return;
        celldata.push({ r, c, v });
        cells++;
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, c);
      });
    });

    const merge: Record<string, { r: number; c: number; rs: number; cs: number }> = {};
    const merges = ((ws.model as { merges?: string[] }).merges ?? []);
    for (const range of merges) {
      const [from, to] = range.split(':').map(address);
      if (!to) continue;
      const m = { r: from.r, c: from.c, rs: to.r - from.r + 1, cs: to.c - from.c + 1 };
      merge[`${m.r}_${m.c}`] = m;
      const master = celldata.find(cell => cell.r === m.r && cell.c === m.c);
      if (master?.v) master.v.mc = { ...m };
      else celldata.push({ r: m.r, c: m.c, v: { mc: { ...m } } });
      for (let r = m.r; r < m.r + m.rs; r++) {
        for (let c = m.c; c < m.c + m.cs; c++) if (r !== m.r || c !== m.c) celldata.push({ r, c, v: { mc: { r: m.r, c: m.c } } });
      }
    }

    const columnlen: Record<string, number> = {};
    for (let c = 1; c <= Math.min(ws.columnCount, 512); c++) {
      const width = ws.getColumn(c).width;
      if (width) columnlen[c - 1] = Math.round(width * 7 + 5);
    }
    const rowlen: Record<string, number> = {};
    ws.eachRow({ includeEmpty: true }, (row, n) => { if (row.height) rowlen[n - 1] = Math.round(row.height * 4 / 3); });

    const config: StoredSheet['config'] = {};
    if (Object.keys(merge).length) config.merge = merge;
    if (Object.keys(columnlen).length) { config.columnlen = columnlen; config.customWidth = Object.fromEntries(Object.keys(columnlen).map(k => [k, 1])); }
    if (Object.keys(rowlen).length) { config.rowlen = rowlen; config.customHeight = Object.fromEntries(Object.keys(rowlen).map(k => [k, 1])); }
    if (borderInfo.length) config.borderInfo = borderInfo;

    const sheet: StoredSheet = {
      name: ws.name.slice(0, 31) || `Sheet${sheets.length + 1}`,
      order: sheets.length,
      celldata,
      row: Math.max(100, maxRow + 30),
      column: Math.max(26, maxCol + 5),
    };
    if (Object.keys(config).length) sheet.config = config;
    if (ws.state === 'hidden') sheet.hide = 1;
    const view = ws.views?.[0] as { state?: string; xSplit?: number; ySplit?: number } | undefined;
    if (view?.state === 'frozen' && (view.xSplit || view.ySplit)) {
      const rows = view.ySplit ?? 0;
      const cols = view.xSplit ?? 0;
      sheet.frozen = { type: rows && cols ? 'rangeBoth' : rows ? 'rangeRow' : 'rangeColumn', range: { row_focus: Math.max(0, rows - 1), column_focus: Math.max(0, cols - 1) } };
    }
    sheets.push(sheet);
  });
  return sheets.length ? sheets : [blankSheet()];
}

type BorderEdge = { style?: number; color?: string } | null;
type CellBorders = Record<string, { l?: BorderEdge; r?: BorderEdge; t?: BorderEdge; b?: BorderEdge }>;

/** Fortune-sheet's border list (per cell, or a range with a border type) → per-cell borders. */
function bordersByCell(borderInfo: unknown[] | undefined): CellBorders {
  const out: CellBorders = {};
  const set = (r: number, c: number, side: 'l' | 'r' | 't' | 'b', edge: BorderEdge) => { (out[`${r}_${c}`] ??= {})[side] = edge; };
  for (const item of (borderInfo ?? []) as Record<string, unknown>[]) {
    if (item.rangeType === 'cell') {
      const v = item.value as { row_index: number; col_index: number; l?: BorderEdge; r?: BorderEdge; t?: BorderEdge; b?: BorderEdge };
      for (const side of ['l', 'r', 't', 'b'] as const) if (v[side]) set(v.row_index, v.col_index, side, v[side]!);
      continue;
    }
    const type = String(item.borderType ?? '');
    const edge = { style: Number(item.style ?? 1), color: String(item.color ?? '#000000') };
    for (const range of (item.range ?? []) as { row: number[]; column: number[] }[]) {
      const [r1, r2] = range.row;
      const [c1, c2] = range.column;
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const all = type === 'border-all';
          if (type === 'border-none') { out[`${r}_${c}`] = {}; continue; }
          if (all || (r === r1 && (type === 'border-outside' || type === 'border-top'))) set(r, c, 't', edge);
          if (all || (r === r2 && (type === 'border-outside' || type === 'border-bottom'))) set(r, c, 'b', edge);
          if (all || (c === c1 && (type === 'border-outside' || type === 'border-left'))) set(r, c, 'l', edge);
          if (all || (c === c2 && (type === 'border-outside' || type === 'border-right'))) set(r, c, 'r', edge);
          if ((type === 'border-inside' || type === 'border-horizontal') && r < r2) set(r, c, 'b', edge);
          if ((type === 'border-inside' || type === 'border-vertical') && c < c2) set(r, c, 'r', edge);
        }
      }
    }
  }
  return out;
}

/** Sheets → an Excel workbook (ExcelJS passed in, so the browser loads it only when downloading). */
export function sheetsToWorkbook(sheets: StoredSheet[], Excel: typeof ExcelJS): ExcelJS.Workbook {
  const workbook = new Excel.Workbook();
  const used = new Set<string>();
  [...sheets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).forEach((sheet, i) => {
    let name = (sheet.name || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Sheet${i + 1}`;
    while (used.has(name.toLowerCase())) name = `${name.slice(0, 28)} ${i + 1}`;
    used.add(name.toLowerCase());
    const ws = workbook.addWorksheet(name, { state: sheet.hide ? 'hidden' : 'visible' });
    const config = sheet.config ?? {};
    const borders = bordersByCell(config.borderInfo);

    for (const { r, c, v } of sheet.celldata) {
      if (!v || (v.mc && (v.mc.r !== r || v.mc.c !== c))) continue;
      const cell = ws.getCell(r + 1, c + 1);
      const fa = v.ct?.fa;
      if (v.f) {
        const result = typeof v.v === 'string' && v.v.trim() !== '' && !Number.isNaN(Number(v.v)) ? Number(v.v) : v.v;
        cell.value = { formula: v.f.replace(/^=/, ''), result: typeof result === 'number' || typeof result === 'string' ? result : undefined } as ExcelJS.CellFormulaValue;
      } else if (v.ct?.t === 'd' && typeof v.v === 'number') {
        cell.value = fromSerial(v.v);
      } else if (typeof v.v === 'number') {
        cell.value = v.v;
      } else if (v.ct?.t === 'n' && typeof v.v === 'string' && v.v.trim() !== '' && !Number.isNaN(Number(v.v))) {
        // Numbers typed into the grid are kept as text with a number type.
        cell.value = Number(v.v);
      } else if (v.ct?.t === 'b' && (v.v === 'TRUE' || v.v === 'FALSE')) {
        cell.value = v.v === 'TRUE';
      } else if (v.v != null && v.v !== '') {
        cell.value = String(v.v);
      } else if (v.ct?.s) {
        // Rich text typed into a cell: its pieces' text.
        cell.value = (v.ct.s as { v?: string }[]).map(part => part.v ?? '').join('');
      }
      if (fa && fa !== 'General') cell.numFmt = fa;
      const font: Partial<ExcelJS.Font> = {};
      if (v.bl) font.bold = true;
      if (v.it) font.italic = true;
      if (v.un) font.underline = true;
      if (v.cl) font.strike = true;
      if (v.fs) font.size = Number(v.fs);
      if (typeof v.ff === 'string') font.name = v.ff;
      const fc = hexToArgb(v.fc);
      if (fc) font.color = { argb: fc };
      if (Object.keys(font).length) cell.font = font;
      const bg = hexToArgb(v.bg);
      if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      const alignment: Partial<ExcelJS.Alignment> = {};
      if (v.ht !== undefined) alignment.horizontal = (['center', 'left', 'right'] as const)[Number(v.ht)];
      if (v.vt !== undefined) alignment.vertical = (['middle', 'top', 'bottom'] as const)[Number(v.vt)];
      if (String(v.tb) === '2') alignment.wrapText = true;
      if (Object.keys(alignment).length) cell.alignment = alignment;
    }
    for (const [key, edges] of Object.entries(borders)) {
      const [r, c] = key.split('_').map(Number);
      const border: Partial<ExcelJS.Borders> = {};
      if (borderTo(edges.t)) border.top = borderTo(edges.t);
      if (borderTo(edges.b)) border.bottom = borderTo(edges.b);
      if (borderTo(edges.l)) border.left = borderTo(edges.l);
      if (borderTo(edges.r)) border.right = borderTo(edges.r);
      if (Object.keys(border).length) ws.getCell(r + 1, c + 1).border = border;
    }
    for (const m of Object.values(config.merge ?? {})) {
      if (m.rs > 1 || m.cs > 1) ws.mergeCells(m.r + 1, m.c + 1, m.r + m.rs, m.c + m.cs);
    }
    for (const [c, px] of Object.entries(config.columnlen ?? {})) ws.getColumn(Number(c) + 1).width = Math.max(1, (px - 5) / 7);
    for (const [r, px] of Object.entries(config.rowlen ?? {})) ws.getRow(Number(r) + 1).height = px * 0.75;
    const frozen = sheet.frozen;
    if (frozen) {
      const rows = frozen.type === 'row' ? 1 : frozen.type === 'rangeRow' || frozen.type === 'rangeBoth' ? (frozen.range?.row_focus ?? 0) + 1 : frozen.type === 'both' ? 1 : 0;
      const cols = frozen.type === 'column' ? 1 : frozen.type === 'rangeColumn' || frozen.type === 'rangeBoth' ? (frozen.range?.column_focus ?? 0) + 1 : frozen.type === 'both' ? 1 : 0;
      if (rows || cols) ws.views = [{ state: 'frozen', xSplit: cols, ySplit: rows }];
    }
  });
  if (!workbook.worksheets.length) workbook.addWorksheet('Sheet1');
  // Excel works the formulas out again when the file is opened.
  workbook.calcProperties = { fullCalcOnLoad: true };
  return workbook;
}

// ── Templates ───────────────────────────────────────────────────────────────

const text = (r: number, c: number, value: string, style: Partial<Cell> = {}): CellWithRowAndCol => ({ r, c, v: { v: value, m: value, ct: { fa: 'General', t: 'g' }, ...style } });
const header = (r: number, labels: string[]) => labels.map((label, c) => text(r, c, label, { bl: 1, bg: '#fef3c7' }));
const formula = (r: number, c: number, f: string, fa = '#,##0.00'): CellWithRowAndCol => ({ r, c, v: { f, ct: { fa, t: 'n' } } });

export interface SheetTemplate { id: string; label: string; description: string; category: string; sheets: () => StoredSheet[] }

export const SHEET_TEMPLATES: SheetTemplate[] = [
  { id: 'blank-sheet', label: 'Blank spreadsheet', description: 'An empty sheet', category: 'General', sheets: () => [blankSheet()] },
  {
    id: 'budget', label: 'Budget', description: 'Planned and actual spending, with totals', category: 'Finance & Budget',
    sheets: () => [{
      ...blankSheet('Budget'),
      celldata: [
        ...header(0, ['Item', 'Category', 'Planned (₦)', 'Actual (₦)', 'Difference (₦)']),
        ...[2, 3, 4, 5, 6].map(r => formula(r - 1, 4, `=C${r}-D${r}`)),
        text(6, 0, 'Total', { bl: 1 }),
        formula(6, 2, '=SUM(C2:C6)'), formula(6, 3, '=SUM(D2:D6)'), formula(6, 4, '=SUM(E2:E6)'),
      ],
      config: { columnlen: { 0: 220, 1: 140, 2: 130, 3: 130, 4: 140 } },
      frozen: { type: 'rangeRow', range: { row_focus: 0, column_focus: 0 } },
    }],
  },
  {
    id: 'tracker', label: 'Task tracker', description: 'Tasks, owners, due dates and status', category: 'Operations',
    sheets: () => [{
      ...blankSheet('Tasks'),
      celldata: header(0, ['Task', 'Owner', 'Due date', 'Status', 'Notes']),
      config: { columnlen: { 0: 260, 1: 140, 2: 110, 3: 110, 4: 260 } },
      frozen: { type: 'rangeRow', range: { row_focus: 0, column_focus: 0 } },
    }],
  },
  {
    id: 'attendance', label: 'Attendance', description: 'Who was present each day this week', category: 'Operations',
    sheets: () => [{
      ...blankSheet('Attendance'),
      celldata: [...header(0, ['Name', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Days present']), ...[2, 3, 4, 5, 6, 7, 8, 9].map(r => formula(r - 1, 6, `=COUNTIF(B${r}:F${r},"P")`, 'General'))],
      config: { columnlen: { 0: 200, 6: 110 } },
      frozen: { type: 'rangeBoth', range: { row_focus: 0, column_focus: 0 } },
    }],
  },
];
