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
 * - The owner can hide it from chosen departments and people, who then can't
 *   see or open it even though it's shared with the company or their
 *   department (the CEO, who reads everything, excepted).
 * - The owner and the CEO delete.
 * - One person edits at a time (an edit lock, renewed while the editor is
 *   open), and a save never overwrites changes saved after it was opened.
 */

import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, runTransaction, serverTimestamp, setDoc, type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage';
import { authDb, storage } from '@/lib/workstation/firebase';

export const DOC_FORMAT = 'ae-doc';
export const DOC_CATEGORIES = ['General', 'Policy & Handbook', 'Finance & Budget', 'Operations', 'Onboarding', 'Templates', 'Technical', 'Legal', 'Meeting Notes', 'Reports'];
/** How long an edit lock lasts without the editor renewing it. */
export const LOCK_MS = 2 * 60 * 1000;
/** Firestore documents are capped at 1 MB; leave room for the other fields. */
export const MAX_CONTENT_BYTES = 900 * 1024;

/** Only me, my team (department), departments I choose, or everyone. */
export type DocShare = 'private' | 'department' | 'departments' | 'all';
/** An AE department a document is shared with. */
export interface SharedDepartment { id: string; name: string }

export interface DocPerson { uid: string; name: string; email: string }
/** An AE Hub department (people's profiles name it by id or by name). */
export interface DocDepartment { id: string; name: string }
/** Who can't see the document although it's shared with them. */
export interface HiddenFrom { departments: DocDepartment[]; people: DocPerson[] }
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
  hiddenFrom: HiddenFrom;
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

/** The hidden-from lists stored on a document (written or uploaded). */
export function hiddenFromOf(d: Record<string, unknown>): HiddenFrom {
  return {
    departments: list(d.hiddenDepartments).map(x => ({ id: str(x.id), name: str(x.name) })).filter(x => x.id || x.name),
    people: list(d.hiddenPeople).map(x => ({ uid: str(x.uid), name: str(x.name), email: str(x.email) })).filter(x => x.uid),
  };
}

const sameDept = (dept: DocDepartment, viewerDept: string) =>
  !!viewerDept && (dept.id.toLowerCase() === viewerDept || dept.name.toLowerCase() === viewerDept);

/** Whether the owner hid the document from this person (or their department). */
export function isHiddenFrom(hidden: HiddenFrom, viewer: Pick<Viewer, 'uid' | 'department'>): boolean {
  return hidden.people.some(p => p.uid === viewer.uid) || hidden.departments.some(d => sameDept(d, viewer.department));
}

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
    hiddenFrom: hiddenFromOf(d),
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

export function permissionsOf(d: WorkDoc, viewer: Viewer): DocPermissions {
  const owner = d.owner.uid === viewer.uid;
  const share = shareOf(d);
  const inTeam = (!!d.aeDepartmentId && d.aeDepartmentId === viewer.aeDepartmentId)
    || (share === 'departments' && !!viewer.aeDepartmentId && d.sharedDepartments.some(x => x.id === viewer.aeDepartmentId));
  const sharedWith = (share === 'all' || inTeam || (share === 'department' && !d.aeDepartmentId && !!viewer.department && d.department.toLowerCase() === viewer.department))
    && !isHiddenFrom(d.hiddenFrom, viewer);
  return {
    // The CEO reads everything; editing still needs the owner to allow it.
    canView: owner || sharedWith || viewer.isCeo,
    canEdit: owner || (sharedWith && d.othersCanEdit),
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

export function subscribeDoc(id: string, onDoc: (d: WorkDoc | null) => void, onError: () => void): Unsubscribe {
  return onSnapshot(doc(authDb, 'documents', id), snap => onDoc(snap.exists() ? toWorkDoc(snap.id, snap.data()) : null), onError);
}

/** Where a team's document is kept: "team:<AE department id>", with the team on the record. */
export function teamFields(team: { id: string; name: string }) {
  return { department: `team:${team.id}`, aeDepartmentId: team.id, aeDepartmentName: team.name };
}

export async function createDoc(input: {
  title: string; content: string; category: string; description: string; share: DocShare; othersCanEdit: boolean; hiddenFrom: HiddenFrom;
  /** Keep it under this AE department's team (its people see it) instead. */
  team?: { id: string; name: string };
  /** With sharing "departments": the AE departments that see it. */
  departments?: SharedDepartment[];
}, me: Viewer): Promise<string> {
  const ref_ = doc(collection(authDb, 'documents'));
  const now = new Date();
  const department = input.share === 'department' ? me.department || 'all' : input.share;
  await setDoc(ref_, {
    // AE Hub's document shape, so it's listed there too.
    name: input.title.trim() || 'Untitled document',
    url: `${window.location.origin}${docPath(ref_.id)}`,
    storagePath: '',
    size: bytesOf(input.content),
    formattedSize: sizeLabel(bytesOf(input.content)),
    dateModified: dayLabel(now),
    type: 'DOC',
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
    // Written documents only.
    format: DOC_FORMAT,
    content: input.content,
    othersCanEdit: input.othersCanEdit,
    ...hiddenFields(input.hiddenFrom),
    updatedBy: me.name,
    lock: { uid: me.uid, name: me.name, email: me.email, at: now.toISOString() },
    serverUpdatedAt: serverTimestamp(),
  });
  return ref_.id;
}

function hiddenFields(hidden: HiddenFrom) {
  return {
    hiddenDepartments: hidden.departments.map(d => ({ id: d.id, name: d.name })),
    hiddenPeople: hidden.people.map(p => ({ uid: p.uid, name: p.name, email: p.email })),
  };
}

export class DocConflictError extends Error {}

/**
 * Saves changes. Refused while someone else is editing, or when someone saved
 * after `baseUpdatedAt` (what this editor last loaded or saved). Returns the
 * new updatedAt.
 */
export async function saveDoc(id: string, changes: Partial<Pick<WorkDoc, 'title' | 'content' | 'category' | 'description' | 'othersCanEdit' | 'hiddenFrom' | 'sharedDepartments'>> & { share?: DocShare },
  baseUpdatedAt: string, me: Viewer): Promise<string> {
  if (changes.content !== undefined && bytesOf(changes.content) > MAX_CONTENT_BYTES) {
    throw new Error('This document is too long to save. Split it into two documents.');
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
    if (changes.category !== undefined) update.category = changes.category;
    if (changes.description !== undefined) update.description = changes.description.trim();
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
    if (can.canShare && changes.hiddenFrom !== undefined) Object.assign(update, hiddenFields(changes.hiddenFrom));
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

/** AE Hub's departments and staff, for choosing who a document is hidden from. */
export async function loadAudience(): Promise<{ departments: DocDepartment[]; people: DocPerson[] }> {
  const [departments, users] = await Promise.all([getDocs(collection(authDb, 'departments')), getDocs(collection(authDb, 'users'))]);
  return {
    departments: departments.docs
      .map(d => ({ id: d.id, name: str(d.data().name) || str(d.data().displayName) || (d.id === 'ceo' ? 'CEO Office' : d.id) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    people: users.docs
      .filter(d => {
        const data = d.data();
        const role = str(data.role).toLowerCase();
        const status = str(data.accountStatus || data.status).toLowerCase();
        return ['staff', 'admin', 'manager', 'ceo'].includes(role) && data.isDeleted !== true && !['fired', 'deleted', 'inactive'].includes(status);
      })
      .map(d => ({ uid: d.id, name: str(d.data().displayName) || str(d.data().fullName) || str(d.data().email) || 'Unnamed', email: str(d.data().email) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
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

/** A standalone HTML page of the document (for Word and printing). */
function standalone(title: string, html: string, extraHead = ''): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${extraHead}
<style>
body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.6;color:#1f2937;max-width:720px;margin:40px auto;padding:0 24px}
h1{font-size:24pt;margin:0 0 16pt}h2{font-size:18pt}h3{font-size:14pt}h4{font-size:12pt}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f4f6}
img{max-width:100%;height:auto}figure{margin:0}figcaption{font-size:10pt;color:#6b7280;text-align:center}
blockquote{border-left:3px solid #c89b3c;margin-left:0;padding-left:12pt;color:#374151}
ul[data-type=taskList]{list-style:none;padding-left:0}ul[data-type=taskList] li{display:flex;gap:6pt}
@media print{body{margin:0;max-width:none}}
</style></head><body><h1>${escapeHtml(title)}</h1>${html}</body></html>`;
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

/** Downloads a Word document (.doc), which Word, Google Docs and LibreOffice open. */
export function downloadWord(title: string, html: string) {
  const head = '<meta name="ProgId" content="Word.Document"><xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:View>Print</w:View></w:WordDocument></xml>';
  download(`${fileName(title)}.doc`, new Blob(['﻿', standalone(title, html, head)], { type: 'application/msword' }));
}

export function downloadHtml(title: string, html: string) {
  download(`${fileName(title)}.html`, new Blob([standalone(title, html)], { type: 'text/html' }));
}

/** Opens the print dialog for the document; choose "Save as PDF" there for a PDF. */
export function printDoc(title: string, html: string) {
  const frame = Object.assign(document.createElement('iframe'), { title: 'Print' });
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  if (!win) { frame.remove(); return; }
  win.document.open();
  win.document.write(standalone(title, html));
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
