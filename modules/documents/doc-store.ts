'use client';

/**
 * Documents written in the AE Workstation (as opposed to uploaded files).
 * They live in AE Hub's `documents` collection beside the uploads, in the same
 * shape plus their content, so they're listed in AE Hub and on the CEO's
 * Documents page too; their `url` opens them here.
 *
 * Who can do what:
 * - Seeing one follows its sharing: just the owner, the owner's department,
 *   an AE department's team (its guides, handbooks and the like; see the
 *   department's resources), or everyone. The CEO reads every document (a viewer unless allowed more).
 * - The owner edits; with "Others can edit", so can everyone it's shared with
 *   (the CEO too, when it's shared with the company or the CEO's department).
 * - The owner and the CEO delete.
 * - One person edits at a time (an edit lock, renewed while the editor is
 *   open), and a save never overwrites changes saved after it was opened.
 */

import {
  collection, deleteDoc, doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc, type Unsubscribe,
} from 'firebase/firestore';
import { cleanPastedHtml } from '@/app/components/cpanel/article/extensions';
import { getDownloadURL, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { authDb, storage } from '@/lib/workstation/firebase';

export const DOC_FORMAT = 'ae-doc';
/** A spreadsheet made in the workstation (its sheets in `sheets`, as JSON; see lib/documents/sheets). */
export const SHEET_FORMAT = 'ae-sheet';
export const DOC_CATEGORIES = ['General', 'Policy & Handbook', 'Finance & Budget', 'Operations', 'Onboarding', 'Templates', 'Technical', 'Legal', 'Meeting Notes', 'Reports'];
/** How long an edit lock lasts without the editor renewing it. */
export const LOCK_MS = 2 * 60 * 1000;
/** Firestore documents are capped at 1 MB; leave room for the other fields. */
export const MAX_CONTENT_BYTES = 900 * 1024;

/** Page orientation, as in Google Docs' page setup. */
export type DocOrientation = 'portrait' | 'landscape';

/** Only me, my team (department), departments I choose, or everyone. */
export type DocShare = 'private' | 'department' | 'departments' | 'all';
/** An AE department a document is shared with. */
export interface SharedDepartment { id: string; name: string }

export interface DocPerson { uid: string; name: string; email: string }
export interface DocLock extends DocPerson { at: string }

export interface WorkDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  description: string;
  /** "all", "private", the owner's AE Hub department, or "team:<AE department id>". */
  department: string;
  /** Kept under an AE department's team: its people see it in Documents. */
  aeDepartmentId: string;
  aeDepartmentName: string;
  /** Shared with these AE departments (sharing "departments"). */
  sharedDepartments: SharedDepartment[];
  othersCanEdit: boolean;
  orientation: DocOrientation;
  /** An uploaded file opened for editing: the original, still downloadable. */
  originalFile: { name: string; url: string } | null;
  /** Made in the workstation (opens here: a document or a spreadsheet), rather than an uploaded file. */
  written: boolean;
  kind: 'doc' | 'sheet' | 'file';
  /** A spreadsheet's sheets (JSON). */
  sheets: string;
  /** An uploaded file's address. */
  fileUrl: string;
  owner: DocPerson;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  lock: DocLock | null;
}

export interface Viewer extends DocPerson {
  /** The viewer's AE Hub department, lowercased ('' if none). */
  department: string;
  /** The viewer's AE department ('' if none). */
  aeDepartmentId: string;
  isCeo: boolean;
}

export interface DocPermissions { canView: boolean; canEdit: boolean; canDelete: boolean; canShare: boolean }

const str = (v: unknown) => (typeof v === 'string' ? v : '');

const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []);

export function toWorkDoc(id: string, d: Record<string, unknown>): WorkDoc {
  const lock = d.lock && typeof d.lock === 'object' ? d.lock as Record<string, unknown> : null;
  return {
    id,
    title: str(d.name) || 'Untitled document',
    content: str(d.content),
    category: str(d.category) || 'General',
    description: str(d.description),
    department: str(d.department) || 'all',
    aeDepartmentId: str(d.aeDepartmentId),
    aeDepartmentName: str(d.aeDepartmentName),
    sharedDepartments: sharedDepartmentsOf(d),
    othersCanEdit: d.othersCanEdit === true,
    orientation: d.orientation === 'landscape' ? 'landscape' : 'portrait',
    originalFile: str(d.originalFileUrl) ? { name: str(d.originalFileName) || 'Original file', url: str(d.originalFileUrl) } : null,
    written: d.format === DOC_FORMAT || d.format === SHEET_FORMAT,
    kind: d.format === DOC_FORMAT ? 'doc' : d.format === SHEET_FORMAT ? 'sheet' : 'file',
    sheets: d.format === SHEET_FORMAT ? str(d.sheets) : '',
    fileUrl: d.format === DOC_FORMAT || d.format === SHEET_FORMAT ? '' : str(d.url),
    owner: { uid: str(d.uploadedByUid), name: str(d.uploadedBy), email: str(d.uploadedByEmail) },
    createdAt: str(d.createdAt),
    updatedAt: str(d.updatedAt),
    updatedBy: str(d.updatedBy),
    lock: lock && str(lock.uid) ? { uid: str(lock.uid), name: str(lock.name), email: str(lock.email), at: str(lock.at) } : null,
  };
}

/** The AE departments a document (written or uploaded) is shared with. */
export function sharedDepartmentsOf(d: Record<string, unknown>): SharedDepartment[] {
  return list(d.sharedDepartments).map(x => ({ id: str(x.id), name: str(x.name) })).filter(x => x.id);
}

export function shareOf(d: Pick<WorkDoc, 'department'>): DocShare {
  return d.department === 'all' ? 'all' : d.department === 'private' ? 'private' : d.department === 'departments' ? 'departments' : 'department';
}

/**
 * Who can do what. A document with no owner (files from before owners were
 * recorded) is like an unowned article: whoever can see it may edit it, and
 * the first to open it in the editor becomes its owner.
 */
export function permissionsOf(d: WorkDoc, viewer: Viewer): DocPermissions {
  const owner = !!d.owner.uid && d.owner.uid === viewer.uid;
  const unowned = !d.owner.uid;
  const share = shareOf(d);
  const inTeam = (!!d.aeDepartmentId && d.aeDepartmentId === viewer.aeDepartmentId)
    || (share === 'departments' && !!viewer.aeDepartmentId && d.sharedDepartments.some(x => x.id === viewer.aeDepartmentId));
  const sharedWith = (share === 'all' || inTeam || (share === 'department' && !d.aeDepartmentId && !!viewer.department && d.department.toLowerCase() === viewer.department));
  return {
    // The CEO reads everything; editing still needs the owner to allow it.
    canView: owner || sharedWith || viewer.isCeo,
    canEdit: owner || (sharedWith && d.othersCanEdit) || (unowned && (sharedWith || viewer.isCeo)),
    canDelete: owner || viewer.isCeo,
    canShare: owner,
  };
}

/** The lock, when someone other than `uid` holds one that hasn't lapsed. */
export function heldByOther(lock: DocLock | null, uid: string, now = Date.now()): DocLock | null {
  if (!lock || lock.uid === uid) return null;
  return now - Date.parse(lock.at) < LOCK_MS ? lock : null;
}

const bytesOf = (text: string) => new Blob([text]).size;
export const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Where a document opens in the workstation. */
export function docPath(id: string, base = '/ws/documents') { return `${base}/${id}`; }

/** Where a document in Documents opens: written ones in the editor, files at their address. */
export async function openDocument(id: string, basePath: string): Promise<{ kind: 'page' | 'file'; href: string } | null> {
  const snap = await getDoc(doc(authDb, 'documents', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.format === DOC_FORMAT) return { kind: 'page', href: docPath(id, basePath) };
  return str(data.url) ? { kind: 'file', href: str(data.url) } : null;
}

/** Downloads a document or spreadsheet from the list (without opening it), in the type it was uploaded as. */
export async function downloadDocCopy(id: string): Promise<void> {
  const snap = await getDoc(doc(authDb, 'documents', id));
  if (!snap.exists()) throw new Error('This document was deleted.');
  const d = toWorkDoc(id, snap.data());
  if (d.kind === 'sheet') {
    const [{ downloadSheets }, { parseSheets }] = await Promise.all([import('./sheet-export'), import('@/lib/documents/sheets')]);
    await downloadSheets(d.title, parseSheets(d.sheets), defaultSheetFormat(d));
    return;
  }
  // In the type it came as (an uploaded .docx downloads as .docx).
  await downloadDocument(d.title, d.content, d.orientation, defaultDocFormat(d));
}

/** Every document in Documents, written and uploaded, live (the CEO's page uses it for who can do what). */
export function subscribeDocs(onDocs: (docs: Map<string, WorkDoc>) => void, onError: () => void): Unsubscribe {
  return onSnapshot(collection(authDb, 'documents'),
    snap => onDocs(new Map(snap.docs.map(d => [d.id, toWorkDoc(d.id, d.data())]))), onError);
}

/** Downloads an uploaded file under its own name (its address alone may open it in the browser instead). */
export function fileDownloadHref(url: string, name: string): string {
  return `/api/documents/download?${new URLSearchParams({ url, name: fileNameOf(name, url) })}`;
}

export function subscribeDoc(id: string, onDoc: (d: WorkDoc | null) => void, onError: () => void): Unsubscribe {
  return onSnapshot(doc(authDb, 'documents', id), snap => onDoc(snap.exists() ? toWorkDoc(snap.id, snap.data()) : null), onError);
}

/** Where a team's document is kept: "team:<AE department id>", with the team on the record. */
export function teamFields(team: { id: string; name: string }) {
  return { department: `team:${team.id}`, aeDepartmentId: team.id, aeDepartmentName: team.name };
}

export async function createDoc(input: {
  title: string; content: string; category: string; description: string; share: DocShare; othersCanEdit: boolean;
  /** Keep it under this AE department's team (its people see it) instead. */
  team?: { id: string; name: string };
  /** With sharing "departments": the AE departments that see it. */
  departments?: SharedDepartment[];
  orientation?: DocOrientation;
  /** A spreadsheet instead of a document: its sheets (JSON). */
  sheets?: string;
}, me: Viewer): Promise<string> {
  const ref_ = doc(collection(authDb, 'documents'));
  const body = input.sheets ?? input.content;
  if (bytesOf(body) > MAX_CONTENT_BYTES) throw new Error('This is too large to save here.');
  const now = new Date();
  const department = input.share === 'department' ? me.department || 'all' : input.share;
  await setDoc(ref_, {
    // AE Hub's document shape, so it's listed there too.
    name: input.title.trim() || 'Untitled document',
    url: `${window.location.origin}${docPath(ref_.id)}`,
    storagePath: '',
    size: bytesOf(body),
    formattedSize: sizeLabel(bytesOf(body)),
    dateModified: dayLabel(now),
    type: input.sheets ? 'XLS' : 'DOC',
    category: input.category,
    department,
    ...(input.team ? teamFields(input.team) : {}),
    sharedDepartments: input.share === 'departments' ? (input.departments ?? []).map(x => ({ id: x.id, name: x.name })) : [],
    uploadedBy: me.name,
    uploadedByUid: me.uid,
    uploadedByEmail: me.email,
    description: input.description.trim(),
    downloadCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    // Made in the workstation only.
    format: input.sheets ? SHEET_FORMAT : DOC_FORMAT,
    content: input.sheets ? '' : input.content,
    ...(input.sheets ? { sheets: input.sheets } : {}),
    othersCanEdit: input.othersCanEdit,
    orientation: input.orientation ?? 'portrait',
    updatedBy: me.name,
    lock: { uid: me.uid, name: me.name, email: me.email, at: now.toISOString() },
    serverUpdatedAt: serverTimestamp(),
  });
  return ref_.id;
}

export class DocConflictError extends Error {}

/**
 * Saves changes. Refused while someone else is editing, or when someone saved
 * after `baseUpdatedAt` (what this editor last loaded or saved). Returns the
 * new updatedAt.
 */
export async function saveDoc(id: string, changes: Partial<Pick<WorkDoc, 'title' | 'content' | 'sheets' | 'category' | 'description' | 'othersCanEdit' | 'sharedDepartments' | 'orientation'>> & { share?: DocShare },
  baseUpdatedAt: string, me: Viewer): Promise<string> {
  if (changes.content !== undefined && bytesOf(changes.content) > MAX_CONTENT_BYTES) {
    throw new Error('This document is too long to save. Split it into two documents.');
  }
  if (changes.sheets !== undefined && bytesOf(changes.sheets) > MAX_CONTENT_BYTES) {
    throw new Error('This spreadsheet is too large to save. Move some sheets into another spreadsheet.');
  }
  return runTransaction(authDb, async tx => {
    const snap = await tx.get(doc(authDb, 'documents', id));
    if (!snap.exists()) throw new Error('This document was deleted.');
    const current = toWorkDoc(snap.id, snap.data());
    const can = permissionsOf(current, me);
    if (!can.canEdit) throw new Error('You can’t edit this document.');
    const other = heldByOther(current.lock, me.uid);
    if (other) throw new DocConflictError(`${other.name || other.email} is editing this document, so your changes weren’t saved.`);
    if (baseUpdatedAt && current.updatedAt && current.updatedAt !== baseUpdatedAt) {
      throw new DocConflictError(`${current.updatedBy || 'Someone'} saved changes after you opened this document. Copy your changes, reload, and add them again.`);
    }
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now.toISOString(), updatedBy: me.name, dateModified: dayLabel(now), serverUpdatedAt: serverTimestamp() };
    if (changes.title !== undefined) update.name = changes.title.trim() || 'Untitled document';
    if (changes.content !== undefined) {
      update.content = changes.content;
      update.size = bytesOf(changes.content);
      update.formattedSize = sizeLabel(bytesOf(changes.content));
    }
    if (changes.sheets !== undefined) {
      update.sheets = changes.sheets;
      update.size = bytesOf(changes.sheets);
      update.formattedSize = sizeLabel(bytesOf(changes.sheets));
    }
    if (changes.category !== undefined) update.category = changes.category;
    if (changes.description !== undefined) update.description = changes.description.trim();
    if (changes.orientation !== undefined) update.orientation = changes.orientation === 'landscape' ? 'landscape' : 'portrait';
    // Sharing is the owner's call.
    if (can.canShare && changes.share !== undefined) {
      if (changes.share === 'department' && current.aeDepartmentId) {
        // A team's document stays with its team.
      } else {
        update.department = changes.share === 'department' ? me.department || 'all' : changes.share;
        update.aeDepartmentId = '';
        update.aeDepartmentName = '';
      }
      if (changes.share !== 'departments') update.sharedDepartments = [];
    }
    if (can.canShare && changes.sharedDepartments !== undefined && (changes.share ?? shareOf(current)) === 'departments') {
      update.sharedDepartments = changes.sharedDepartments.map(x => ({ id: x.id, name: x.name }));
    }
    if (can.canShare && changes.othersCanEdit !== undefined) update.othersCanEdit = changes.othersCanEdit;
    tx.update(snap.ref, update);
    return update.updatedAt as string;
  });
}

/**
 * Takes (or renews) the edit lock. Returns the lock now in force: yours, or
 * whoever else holds it. `force` takes it over (the owner only).
 */
export async function lockDoc(id: string, me: Viewer, force = false): Promise<{ locked: boolean; lock: DocLock | null }> {
  return runTransaction(authDb, async tx => {
    const snap = await tx.get(doc(authDb, 'documents', id));
    if (!snap.exists()) return { locked: false, lock: null };
    const current = toWorkDoc(snap.id, snap.data());
    if (!permissionsOf(current, me).canEdit) return { locked: false, lock: null };
    const other = heldByOther(current.lock, me.uid);
    if (other && !(force && current.owner.uid === me.uid)) return { locked: false, lock: other };
    const lock = { uid: me.uid, name: me.name, email: me.email, at: new Date().toISOString() };
    tx.update(snap.ref, { lock });
    return { locked: true, lock };
  });
}

export async function releaseDoc(id: string, me: Viewer): Promise<void> {
  await runTransaction(authDb, async tx => {
    const snap = await tx.get(doc(authDb, 'documents', id));
    if (snap.exists() && toWorkDoc(snap.id, snap.data()).lock?.uid === me.uid) tx.update(snap.ref, { lock: null });
  }).catch(() => undefined);
}

export async function removeDoc(id: string): Promise<void> {
  await deleteDoc(doc(authDb, 'documents', id));
}

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function fileTypeOf(name: string, mime: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'XLSX';
  if (['doc', 'docx'].includes(ext)) return 'DOCX';
  if (['ppt', 'pptx'].includes(ext)) return 'PPTX';
  if (['zip', 'rar', '7z'].includes(ext)) return 'ZIP';
  if (mime.startsWith('image/')) return 'IMAGE';
  return 'OTHER';
}

/**
 * Uploads a file to AE Hub's storage and lists it in Documents, in AE Hub's
 * shape (so AE Hub lists it too). `where`: everyone ("all"), an AE Hub
 * department, or an AE department's team. Returns the document's id.
 */
export async function uploadFileDoc(file: File, opts: {
  category: string; description: string;
  where: { department: string } | { team: { id: string; name: string } } | { departments: SharedDepartment[] };
}, me: DocPerson, onProgress?: (percent: number) => void): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Files can be up to 25 MB.');
  const placement: Record<string, unknown> & { department: string } = 'team' in opts.where ? teamFields(opts.where.team)
    : 'departments' in opts.where ? { department: 'departments', sharedDepartments: opts.where.departments.map(x => ({ id: x.id, name: x.name })) }
      : { department: opts.where.department };
  const folder = placement.department.replace(/[^\w-]+/g, '-');
  const storagePath = `documents/${folder}/${Date.now()}_${file.name.replace(/[^\w.\- ]+/g, '_')}`;
  const task = uploadBytesResumable(ref(storage, storagePath), file, { contentType: file.type || undefined });
  await new Promise<void>((resolve, reject) => task.on('state_changed',
    snap => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), reject, () => resolve()));
  const url = await getDownloadURL(task.snapshot.ref);
  const now = new Date();
  const record = doc(collection(authDb, 'documents'));
  await setDoc(record, {
    name: file.name, url, storagePath, size: file.size, formattedSize: sizeLabel(file.size), dateModified: dayLabel(now),
    type: fileTypeOf(file.name, file.type), category: opts.category, ...placement,
    uploadedBy: me.name, uploadedByUid: me.uid, uploadedByEmail: me.email, description: opts.description.trim(),
    createdAt: now.toISOString(), updatedAt: now.toISOString(), downloadCount: 0,
  });
  return record.id;
}

// ── Editing uploaded files ──────────────────────────────────────────────────

/** Uploaded files that can be opened in the editor (keep in step with /api/documents/convert). */
export const EDITABLE_FILE_TYPES = ['docx', 'pdf', 'txt', 'md', 'html', 'htm'];
/** A file's type (extension), from its name or, for files named without one, its address. */
export function fileExtOf(name: string, url = ''): string {
  const fromName = /\.([a-z0-9]{1,5})$/i.exec(name.trim())?.[1];
  if (fromName) return fromName.toLowerCase();
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    return /\.([a-z0-9]{1,5})$/i.exec(path)?.[1]?.toLowerCase() ?? '';
  } catch {
    return '';
  }
}

/** The name to save a file under: its own, with its type added when the name lacks one. */
export function fileNameOf(name: string, url = ''): string {
  const ext = fileExtOf(name, url);
  const base = name.trim() || 'document';
  return ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base;
}

export const isEditableFile = (name: string, url = '') => EDITABLE_FILE_TYPES.includes(fileExtOf(name, url));

/**
 * Files shown read-only in the document view (converted on the fly, the file itself unchanged).
 * PDFs and images open in the browser's own viewer instead, which shows them as they are.
 */
export const isPreviewableFile = (name: string, url = '') => isEditableFile(name, url) && fileExtOf(name, url) !== 'pdf';

/** An uploaded Word, PDF, text or web page file as HTML for the editor (converted on the server). */
export async function convertFile(url: string, name: string): Promise<string> {
  const res = await fetch('/api/documents/convert', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, name: fileNameOf(name, url) }),
  });
  const body = await res.json().catch(() => ({})) as { html?: string; error?: string };
  if (!res.ok || typeof body.html !== 'string') throw new Error(body.error || 'The file could not be opened.');
  return body.html;
}

/** Excel (.xlsx) and CSV files: shown and edited in the built-in spreadsheet. */
export const isSheetFile = (name: string, url = '') => ['xlsx', 'csv'].includes(fileExtOf(name, url));

/** An uploaded Excel or CSV file as sheets (JSON), converted on the server. */
export async function convertSheetFile(url: string, name: string): Promise<string> {
  const res = await fetch('/api/documents/convert-sheet', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, name: fileNameOf(name, url) }),
  });
  const body = await res.json().catch(() => ({})) as { sheets?: unknown; error?: string };
  if (!res.ok || !Array.isArray(body.sheets)) throw new Error(body.error || 'The spreadsheet could not be opened.');
  return JSON.stringify(body.sheets);
}

/** An uploaded Excel or CSV file becomes a spreadsheet you can edit here (same place, same sharing). */
export async function makeSheetEditable(id: string, me: Viewer): Promise<void> {
  const ref_ = doc(authDb, 'documents', id);
  const snap = await getDoc(ref_);
  if (!snap.exists()) throw new Error('This file was deleted.');
  const data = snap.data();
  if (data.format === SHEET_FORMAT) return;
  const current = toWorkDoc(id, data);
  if (!permissionsOf(current, me).canEdit) throw new Error('You can’t edit this file. Ask its owner to let others edit it.');
  const fileUrl = str(data.url);
  const name = fileNameOf(str(data.name), fileUrl);
  if (!isSheetFile(name)) throw new Error('Only Excel (.xlsx) and CSV files open in the spreadsheet.');
  const sheets = await convertSheetFile(fileUrl, name);
  if (bytesOf(sheets) > MAX_CONTENT_BYTES) throw new Error('This spreadsheet is too large to edit here. Download it instead.');
  const now = new Date();
  await updateDoc(ref_, {
    format: SHEET_FORMAT,
    sheets,
    content: '',
    type: 'XLS',
    name: name.replace(/\.[^.]+$/, '') || name,
    originalFileName: name,
    originalFileUrl: fileUrl,
    url: `${window.location.origin}${docPath(id)}`,
    size: bytesOf(sheets),
    formattedSize: sizeLabel(bytesOf(sheets)),
    othersCanEdit: data.othersCanEdit === true,
    updatedAt: now.toISOString(),
    updatedBy: me.name,
    dateModified: dayLabel(now),
    lock: null,
    serverUpdatedAt: serverTimestamp(),
    ...(current.owner.uid ? {} : { uploadedBy: me.name, uploadedByUid: me.uid, uploadedByEmail: me.email }),
  });
}

/** Uploaded files shown here (in the document view or the spreadsheet) rather than in the browser's viewer. */
export const opensHere = (name: string, url = '') => isPreviewableFile(name, url) || isSheetFile(name, url);

/** Uploaded files that can be turned into a document or spreadsheet to edit. */
export const canBecomeEditable = (name: string, url = '') => isEditableFile(name, url) || isSheetFile(name, url);

/** Turns an uploaded file into a document (Word, PDF, text, web page) or a spreadsheet (Excel, CSV). */
export function makeFileEditable(id: string, me: Viewer, name: string, url = ''): Promise<void> {
  return isSheetFile(name, url) ? makeSheetEditable(id, me) : makeEditable(id, me);
}

/** What opening a file in the editor keeps, for the confirmation before it (PDFs keep less than Word files). */
export function editNote(name: string, url = ''): string {
  if (isSheetFile(name, url)) return 'Values, formulas, formatting, merged cells, column widths and frozen rows come across. Charts, images and comments aren’t kept.';
  return fileExtOf(name, url) === 'pdf'
    ? 'A PDF comes across as text: headings, paragraphs, lists and simple tables. Images and the exact layout aren’t kept, and a scanned PDF has no text to edit.'
    : 'Some Word formatting may look different.';
}

/** Images that came inline (data: addresses, e.g. from a Word file) go to storage instead. */
export async function storeInlineImages(html: string, me: Pick<Viewer, 'uid'>): Promise<string> {
  if (!html.includes('src="data:')) return html;
  const page = new DOMParser().parseFromString(html, 'text/html');
  const images = Array.from(page.querySelectorAll<HTMLImageElement>('img[src^="data:"]')).slice(0, 40);
  for (const [i, img] of images.entries()) {
    try {
      const blob = await (await fetch(img.src)).blob();
      const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      img.src = await uploadDocImage(new File([blob], `image-${i + 1}.${ext}`, { type: blob.type }), me);
    } catch {
      img.remove();
    }
  }
  return page.body.innerHTML;
}

/**
 * Opens an uploaded Word, text or web page file for editing: it becomes a
 * written document in place (same sharing, same list entry), and the
 * original file stays available to download. For whoever can edit it (the
 * person who uploaded it).
 */
export async function makeEditable(id: string, me: Viewer): Promise<void> {
  const ref_ = doc(authDb, 'documents', id);
  const snap = await getDoc(ref_);
  if (!snap.exists()) throw new Error('This document was deleted.');
  const data = snap.data();
  if (data.format === DOC_FORMAT) return;
  const current = toWorkDoc(id, data);
  if (!permissionsOf(current, me).canEdit) throw new Error('You can’t edit this file. Ask its owner to let others edit it.');
  const fileUrl = str(data.url);
  const name = fileNameOf(str(data.name), fileUrl);
  if (!isEditableFile(name)) throw new Error('Only Word (.docx), PDF, text and web page files can be edited.');
  const html = cleanPastedHtml(await storeInlineImages(await convertFile(fileUrl, name), me));
  if (bytesOf(html) > MAX_CONTENT_BYTES) throw new Error('This file is too long to edit here. Download it instead.');
  const now = new Date();
  await updateDoc(ref_, {
    format: DOC_FORMAT,
    content: html,
    type: 'DOC',
    name: name.replace(/\.[^.]+$/, '') || name,
    originalFileName: name,
    originalFileUrl: fileUrl,
    url: `${window.location.origin}${docPath(id)}`,
    size: bytesOf(html),
    formattedSize: sizeLabel(bytesOf(html)),
    othersCanEdit: data.othersCanEdit === true,
    orientation: 'portrait',
    updatedAt: now.toISOString(),
    updatedBy: me.name,
    dateModified: dayLabel(now),
    lock: null,
    serverUpdatedAt: serverTimestamp(),
    // A file with no owner becomes the editor's (as the first person to edit it).
    ...(current.owner.uid ? {} : { uploadedBy: me.name, uploadedByUid: me.uid, uploadedByEmail: me.email }),
  });
}

/** Uploads an image for a document to AE Hub's storage and returns its address. */
export async function uploadDocImage(file: File, me: Pick<Viewer, 'uid'>, name?: string): Promise<string> {
  if (file.size > 8 * 1024 * 1024) throw new Error('Images can be up to 8 MB.');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const base = (name || file.name.replace(/\.[^.]+$/, '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image';
  const stored = await uploadBytes(ref(storage, `documents/images/${me.uid}/${Date.now()}_${base}.${ext}`), file, { contentType: file.type });
  return getDownloadURL(stored.ref);
}

// ── Export ──────────────────────────────────────────────────────────────────

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A standalone HTML page of the document (for Word and printing), on a page of the given orientation. */
function standalone(title: string, html: string, orientation: DocOrientation, extraHead = ''): string {
  const landscape = orientation === 'landscape';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${extraHead}
<style>
@page{size:${landscape ? '11in 8.5in' : '8.5in 11in'};margin:1in}
body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.6;color:#1f2937;max-width:${landscape ? '960px' : '720px'};margin:40px auto;padding:0 24px}
h1{font-size:24pt;margin:0 0 16pt}h2{font-size:18pt}h3{font-size:14pt}h4{font-size:12pt}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f4f6}
img{max-width:100%;height:auto}figure{margin:0}figcaption{font-size:10pt;color:#6b7280;text-align:center}
blockquote{border-left:3px solid #c89b3c;margin-left:0;padding-left:12pt;color:#374151}
ul[data-type=taskList]{list-style:none;padding-left:0}ul[data-type=taskList] li{display:flex;gap:6pt}
@media print{body{margin:0;max-width:none}}
</style></head><body>${html}</body></html>`;
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileName = (title: string) => (title.trim() || 'document').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80);

export function downloadHtml(title: string, html: string, orientation: DocOrientation = 'portrait') {
  download(`${fileName(title)}.html`, new Blob([standalone(title, html, orientation)], { type: 'text/html' }));
}

export type DocFormat = 'docx' | 'pdf' | 'html' | 'txt' | 'md';
export const DOC_FORMATS: { id: DocFormat; label: string }[] = [
  { id: 'docx', label: 'Word document (.docx)' },
  { id: 'pdf', label: 'PDF (print, then Save as PDF)' },
  { id: 'html', label: 'Web page (.html)' },
  { id: 'txt', label: 'Plain text (.txt)' },
  { id: 'md', label: 'Markdown (.md)' },
];

/** A document downloads as the type it was uploaded as (a .docx stays a .docx, a .txt a .txt); otherwise as Word. */
export function defaultDocFormat(d: Pick<WorkDoc, 'originalFile'>): DocFormat {
  const ext = d.originalFile ? fileExtOf(d.originalFile.name, d.originalFile.url) : '';
  return ext === 'htm' ? 'html' : (['docx', 'pdf', 'html', 'txt', 'md'] as const).find(f => f === ext) ?? 'docx';
}

/** A spreadsheet downloads as the type it was uploaded as (.xlsx or .csv); otherwise as Excel. */
export function defaultSheetFormat(d: Pick<WorkDoc, 'originalFile'>): 'xlsx' | 'csv' {
  return d.originalFile && fileExtOf(d.originalFile.name, d.originalFile.url) === 'csv' ? 'csv' : 'xlsx';
}

/** The document's text, a paragraph per line. */
function htmlToText(html: string): string {
  const page = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h[1-6]|li|tr|blockquote|pre|figcaption)>/gi, '$&\n'), 'text/html');
  page.querySelectorAll('td, th').forEach(cell => cell.append('\t'));
  return (page.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** Downloads a document in the chosen format (Word is made on the server; PDF goes through printing). */
export async function downloadDocument(title: string, html: string, orientation: DocOrientation, format: DocFormat): Promise<void> {
  if (format === 'pdf') { printDoc(title, html, orientation); return; }
  if (format === 'html') { downloadHtml(title, html, orientation); return; }
  if (format === 'txt') { download(`${fileName(title)}.txt`, new Blob([htmlToText(html)], { type: 'text/plain;charset=utf-8' })); return; }
  if (format === 'md') {
    const { default: TurndownService } = await import('turndown');
    const markdown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' }).turndown(html);
    download(`${fileName(title)}.md`, new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    return;
  }
  const res = await fetch('/api/documents/export', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html, title, orientation }),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || 'The Word file could not be made.');
  download(`${fileName(title)}.docx`, await res.blob());
}

/** Opens the print dialog for the document; choose "Save as PDF" there for a PDF. */
export function printDoc(title: string, html: string, orientation: DocOrientation = 'portrait') {
  const frame = Object.assign(document.createElement('iframe'), { title: 'Print' });
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) { frame.remove(); return; }
  win.document.open();
  win.document.write(standalone(title, html, orientation));
  win.document.close();
  const go = () => { win.focus(); win.print(); setTimeout(() => frame.remove(), 1000); };
  // Let images load before printing.
  const images = [...win.document.images].filter(img => !img.complete);
  if (!images.length) setTimeout(go, 50);
  else { let left = images.length; images.forEach(img => { img.onload = img.onerror = () => { if (--left === 0) go(); }; }); setTimeout(go, 4000); }
}

// ── Templates ───────────────────────────────────────────────────────────────

export interface DocTemplate { id: string; label: string; description: string; category: string; content: (author: string, date: string) => string }

export const DOC_TEMPLATES: DocTemplate[] = [
  { id: 'blank', label: 'Blank document', description: 'Start from an empty page', category: 'General', content: () => '<p></p>' },
  {
    id: 'meeting', label: 'Meeting notes', description: 'Attendees, agenda, decisions and actions', category: 'Meeting Notes',
    content: (author, date) => `<p><strong>Date:</strong> ${date}<br><strong>Note taker:</strong> ${escapeHtml(author)}</p><h2>Attendees</h2><ul><li><p></p></li></ul><h2>Agenda</h2><ol><li><p></p></li></ol><h2>Notes</h2><p></p><h2>Decisions</h2><ul><li><p></p></li></ul><h2>Action items</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Owner: task, due date</p></li></ul>`,
  },
  {
    id: 'memo', label: 'Memo', description: 'A short internal announcement', category: 'General',
    content: (author, date) => `<p><strong>To:</strong> <br><strong>From:</strong> ${escapeHtml(author)}<br><strong>Date:</strong> ${date}<br><strong>Subject:</strong> </p><hr><h2>Summary</h2><p></p><h2>Details</h2><p></p><h2>Next steps</h2><ul><li><p></p></li></ul>`,
  },
  {
    id: 'report', label: 'Report', description: 'Summary, findings and recommendations', category: 'Reports',
    content: (author, date) => `<p>Prepared by ${escapeHtml(author)} · ${date}</p><h2>Executive summary</h2><p></p><h2>Background</h2><p></p><h2>Findings</h2><table><tbody><tr><th><p>Area</p></th><th><p>Finding</p></th><th><p>Impact</p></th></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table><h2>Recommendations</h2><ol><li><p></p></li></ol>`,
  },
  {
    id: 'policy', label: 'Policy', description: 'Purpose, scope, the policy and who owns it', category: 'Policy & Handbook',
    content: (author, date) => `<p><strong>Owner:</strong> ${escapeHtml(author)}<br><strong>Effective:</strong> ${date}<br><strong>Review by:</strong> </p><h2>Purpose</h2><p></p><h2>Scope</h2><p></p><h2>Policy</h2><ol><li><p></p></li></ol><h2>Responsibilities</h2><p></p><h2>Related documents</h2><ul><li><p></p></li></ul>`,
  },
  {
    id: 'handbook', label: 'Handbook or guide', description: 'How the team works, its tools and who to ask', category: 'Policy & Handbook',
    content: (author, date) => `<p>Maintained by ${escapeHtml(author)} · last reviewed ${date}</p><h2>Welcome</h2><p>What this team does and who it serves.</p><h2>How we work</h2><ul><li><p>Working hours and shifts</p></li><li><p>How work is assigned and tracked</p></li><li><p>Meetings and check-ins</p></li></ul><h2>Processes</h2><ol><li><p></p></li></ol><h2>Tools and access</h2><table><tbody><tr><th><p>Tool</p></th><th><p>What it's for</p></th><th><p>How to get access</p></th></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table><h2>Who to ask</h2><ul><li><p></p></li></ul><h2>Your first week</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Read this handbook</p></li><li data-type="taskItem" data-checked="false"><p>Meet the team</p></li></ul>`,
  },
  {
    id: 'brief', label: 'Project brief', description: 'Goals, scope, timeline and team', category: 'Operations',
    content: (author, date) => `<p>Prepared by ${escapeHtml(author)} · ${date}</p><h2>Overview</h2><p></p><h2>Goals</h2><ul><li><p></p></li></ul><h2>Scope</h2><p><strong>In scope:</strong> </p><p><strong>Out of scope:</strong> </p><h2>Timeline</h2><table><tbody><tr><th><p>Milestone</p></th><th><p>Date</p></th><th><p>Owner</p></th></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table><h2>Team</h2><p></p>`,
  },
];
