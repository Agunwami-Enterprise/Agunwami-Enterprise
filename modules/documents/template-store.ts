/**
 * Templates people add for new documents and spreadsheets (next to the
 * built-in ones): from an uploaded file (Word, PDF, text, web page, Excel or
 * CSV, converted once as it's added) or saved from a document. Kept in the
 * enterprise database through /api/documents/templates; whoever added one,
 * and the CEO, can delete it.
 */

import { cleanPastedHtml } from '@/app/components/cpanel/article/extensions';
import { isEditableFile, isSheetFile, storeInlineImages, type Viewer } from './doc-store';

export interface CustomTemplate {
  id: string;
  label: string;
  description: string;
  category: string;
  kind: 'doc' | 'sheet';
  createdBy: string;
  createdAt: string;
  canDelete: boolean;
}

async function json<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => ({})) as T & { error?: string };
  if (!res.ok) throw new Error(body.error || fallback);
  return body;
}

/** The company's templates, the built-in ones the CEO removed, and whether you can remove built-in ones (the CEO). */
export async function listTemplates(): Promise<{ templates: CustomTemplate[]; hidden: string[]; canManageBuiltIns: boolean }> {
  const body = await json<{ templates: CustomTemplate[]; hidden?: string[]; canManageBuiltIns?: boolean }>(
    await fetch('/api/documents/templates', { cache: 'no-store' }), 'Templates could not be loaded.');
  return { templates: body.templates ?? [], hidden: body.hidden ?? [], canManageBuiltIns: !!body.canManageBuiltIns };
}

/** Removes a built-in template for everyone (the CEO). */
export async function hideBuiltInTemplate(id: string): Promise<void> {
  await json(await fetch(`/api/documents/templates?builtin=${encodeURIComponent(id)}`, { method: 'DELETE' }), 'The template could not be removed.');
}

/** Brings back the built-in templates the CEO removed. */
export async function restoreBuiltInTemplates(): Promise<void> {
  await json(await fetch('/api/documents/templates', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restoreBuiltIns: true }),
  }), 'The templates could not be restored.');
}

/** A template's contents: HTML for a document, sheets (JSON) for a spreadsheet. */
export async function getTemplate(id: string): Promise<{ content: string; sheets: string }> {
  const { template } = await json<{ template: { content: string; sheets: string } }>(
    await fetch(`/api/documents/templates?id=${encodeURIComponent(id)}`, { cache: 'no-store' }), 'That template could not be loaded.');
  return template;
}

export async function addTemplate(input: { label: string; description: string; category: string; kind: 'doc' | 'sheet'; content?: string; sheets?: string }, me: Viewer): Promise<string> {
  const { id } = await json<{ id: string }>(await fetch('/api/documents/templates', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, createdBy: me.name }),
  }), 'The template could not be saved.');
  return id;
}

export async function deleteTemplate(id: string): Promise<void> {
  await json(await fetch(`/api/documents/templates?id=${encodeURIComponent(id)}`, { method: 'DELETE' }), 'The template could not be deleted.');
}

/** Files that can become templates: documents (Word, PDF, text, web page) and spreadsheets (Excel, CSV). */
export const isTemplateFile = (name: string) => isEditableFile(name) || isSheetFile(name);

/** A file's contents as a template (converted on the server; images in Word files are stored). */
export async function templateFromFile(file: File, me: Viewer): Promise<{ kind: 'doc' | 'sheet'; content?: string; sheets?: string }> {
  const sheet = isSheetFile(file.name);
  if (!sheet && !isEditableFile(file.name)) throw new Error('Templates can be Word (.docx), PDF, text, web page, Excel (.xlsx) or CSV files.');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(sheet ? '/api/documents/convert-sheet' : '/api/documents/convert', { method: 'POST', body: form });
  if (sheet) {
    const { sheets } = await json<{ sheets: unknown[] }>(res, 'The spreadsheet could not be read.');
    return { kind: 'sheet', sheets: JSON.stringify(sheets) };
  }
  const { html } = await json<{ html: string }>(res, 'The file could not be read.');
  return { kind: 'doc', content: cleanPastedHtml(await storeInlineImages(html, me)) };
}

/** The name a file suggests for its template. */
export const templateNameOf = (file: File) => file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 80) || 'Template';
