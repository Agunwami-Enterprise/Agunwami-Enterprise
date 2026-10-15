/**
 * POST /api/documents/convert-sheet { url, name } | form data "file"
 *
 * Reads an uploaded Excel (.xlsx) or CSV file into sheets for the built-in
 * spreadsheet, to show or edit it (or a file sent with the request: a
 * template being added). Runs here because AE Hub's storage
 * doesn't let the browser read files directly; only files in AE Hub's own
 * storage are fetched.
 */

import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireSession } from '@/lib/workstation/api-auth';
import { readSource } from '@/lib/documents/read-source';
import { csvToSheets, workbookToSheets } from '@/lib/documents/sheets';

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const source = await readSource(request);
  if (source instanceof NextResponse) return source;
  const { buffer, name, ext } = source;
  if (ext !== 'xlsx' && ext !== 'csv') {
    return NextResponse.json({ error: ext === 'xls' ? 'Old Excel files (.xls) can’t be opened here. Save it as .xlsx in Excel and upload that.' : 'Only Excel (.xlsx) and CSV files open in the spreadsheet.' }, { status: 400 });
  }
  try {
    if (ext === 'csv') {
      return NextResponse.json({ sheets: csvToSheets(buffer.toString('utf-8'), name.replace(/\.csv$/i, '').slice(0, 31) || 'Sheet1') });
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    return NextResponse.json({ sheets: workbookToSheets(workbook) });
  } catch (err) {
    console.error('[POST /api/documents/convert-sheet]', err);
    return NextResponse.json({ error: 'The spreadsheet could not be opened. It may be damaged or password-protected.' }, { status: 422 });
  }
}
