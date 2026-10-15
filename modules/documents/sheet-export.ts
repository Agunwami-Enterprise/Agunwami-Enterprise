/**
 * Downloads a spreadsheet as Excel (.xlsx, every sheet) or CSV (one sheet).
 * ExcelJS is loaded only when downloading.
 */

import { sheetToCsv, sheetsToWorkbook, type StoredSheet } from '@/lib/documents/sheets';

const fileName = (title: string) => (title.trim() || 'spreadsheet').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80);

function save(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadSheets(title: string, sheets: StoredSheet[], format: 'xlsx' | 'csv', sheetIndex = 0) {
  if (format === 'csv') {
    const sheet = sheets[sheetIndex] ?? sheets[0];
    const name = sheets.length > 1 ? `${fileName(title)} - ${sheet.name}` : fileName(title);
    save(`${name}.csv`, new Blob(['﻿', sheetToCsv(sheet)], { type: 'text/csv;charset=utf-8' }));
    return;
  }
  const { default: ExcelJS } = await import('exceljs');
  const buffer = await sheetsToWorkbook(sheets, ExcelJS).xlsx.writeBuffer();
  save(`${fileName(title)}.xlsx`, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
