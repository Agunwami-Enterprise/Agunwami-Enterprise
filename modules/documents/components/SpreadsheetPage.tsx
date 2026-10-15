'use client';

/**
 * A spreadsheet in Documents (/ws/documents/[id], /ceo/documents/[id]): the
 * built-in spreadsheet (Fortune-sheet: formulas, formatting, merges, borders,
 * frozen rows, several sheets), saving automatically. The same rules as
 * documents: one person edits at a time, whoever can edit chooses Editing or
 * Viewing, everyone else (the CEO too, unless given editing) views. An
 * uploaded Excel or CSV file is shown here read-only, and Edit turns it into
 * a spreadsheet (the original stays downloadable).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Check, ChevronDown, CloudOff, Download, Eye, FileSpreadsheet, Loader2, Lock, PanelRightClose, PanelRightOpen, Pencil, Trash2,
} from 'lucide-react';
import type { Sheet } from '@fortune-sheet/core';
import '@fortune-sheet/react/dist/index.css';
import { useConfirm } from '@/app/components/common/AeModal';
import { useAuth } from '@/lib/workstation/auth-context';
import { deniedHref } from '@/lib/workstation/access-denied';
import { subscribeUserProfile } from '@/modules/settings/services';
import { compactSheets, parseSheets, prepareSheets, type StoredSheet } from '@/lib/documents/sheets';
import DepartmentPicker from './DepartmentPicker';
import SaveTemplateButton from './SaveTemplateButton';
import { downloadSheets } from '../sheet-export';
import {
  DOC_CATEGORIES, DocConflictError, convertSheetFile, defaultSheetFormat, editNote, fileDownloadHref, heldByOther, lockDoc, makeSheetEditable, permissionsOf, releaseDoc,
  removeDoc, saveDoc, shareOf, subscribeDoc, type DocLock, type DocShare, type SharedDepartment, type Viewer, type WorkDoc,
} from '../doc-store';

// The grid draws on a canvas in the browser: never on the server.
const Workbook = dynamic(() => import('@fortune-sheet/react').then(m => m.Workbook), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#a3a3a3]" aria-hidden="true" /></div>,
});

const AUTOSAVE_MS = 1500;
const LOCK_RENEW_MS = 60_000;
const LOCK_RETRY_MS = 20_000;

// Without the tools whose results wouldn't be kept (images, screenshots, conditional formatting, validation, filters).
const TOOLBAR = ['undo', 'redo', 'format-painter', 'clear-format', '|', 'currency-format', 'percentage-format', 'number-decrease', 'number-increase', 'format', '|',
  'font', '|', 'font-size', '|', 'bold', 'italic', 'strike-through', 'underline', '|', 'font-color', 'background', 'border', 'merge-cell', '|',
  'horizontal-align', 'vertical-align', 'text-wrap', 'text-rotation', '|', 'freeze', 'link', 'comment', 'quick-formula', 'splitColumn', 'search'];
const CELL_MENU = ['copy', 'paste', '|', 'insert-row', 'insert-column', 'delete-row', 'delete-column', 'delete-cell', 'hide-row', 'hide-column', 'set-row-height', 'set-column-width', '|', 'clear', 'sort', 'orderAZ', 'orderZA', 'link', 'cell-format'];

const SHARE_LABELS: Record<DocShare, string> = { private: 'Only me', department: 'My team or department', departments: 'Departments I choose…', all: 'Everyone in the company' };

type Mode = { kind: 'loading' } | { kind: 'checking' } | { kind: 'editing' } | { kind: 'locked'; by: DocLock } | { kind: 'view' };
type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';
interface Form { title: string; category: string; description: string; share: DocShare; othersCanEdit: boolean; sharedDepartments: SharedDepartment[] }
type Pending = Partial<Form & { sheets: true }>;

const formOf = (d: WorkDoc): Form => ({ title: d.title, category: d.category, description: d.description, share: shareOf(d), othersCanEdit: d.othersCanEdit, sharedDepartments: d.sharedDepartments });

export default function SpreadsheetPage({ id, basePath, isCeo, aeDepartmentId = '', startInView = false }: {
  id: string; basePath: string; isCeo: boolean; aeDepartmentId?: string; startInView?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [department, setDepartment] = useState<string | null>(null);
  const [docData, setDocData] = useState<WorkDoc | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'loading' });
  const [form, setForm] = useState<Form>({ title: '', category: 'General', description: '', share: 'department', othersCanEdit: false, sharedDepartments: [] });
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [wantEdit, setWantEdit] = useState(!startInView);
  const [converting, setConverting] = useState(false);
  // What the grid shows; `version` remounts it when the sheets change from outside (not from typing).
  const [sheets, setSheets] = useState<StoredSheet[] | null>(null);
  const [version, setVersion] = useState(0);
  const [fileError, setFileError] = useState('');

  const docRef = useRef<WorkDoc | null>(null);
  const baseRef = useRef('');
  const pendingRef = useRef<Pending>({});
  const latestRef = useRef<Sheet[] | null>(null);
  const savedJsonRef = useRef('');
  const activeSheetRef = useRef<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const modeRef = useRef<Mode>(mode);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const me: Viewer | null = user && department !== null
    ? { uid: user.uid, name: user.displayName || user.email || 'Team member', email: user.email || '', department, isCeo, aeDepartmentId }
    : null;
  const meRef = useRef(me);
  useEffect(() => { meRef.current = me; });
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const can = docData && me ? permissionsOf(docData, me) : null;
  const canEdit = !!can?.canEdit;
  const editing = mode.kind === 'editing';
  const isFile = !!docData && docData.kind === 'file';

  useEffect(() => (user?.uid
    ? subscribeUserProfile(user.uid, p => setDepartment(String(p?.department ?? '').toLowerCase()), () => setDepartment(''))
    : undefined), [user?.uid]);

  /** Shows the stored spreadsheet (when not editing it, and when editing starts). */
  const showStored = useCallback((d: WorkDoc) => {
    setForm(formOf(d));
    baseRef.current = d.updatedAt;
    if (d.kind !== 'sheet') return;
    if (d.sheets === savedJsonRef.current) return;
    savedJsonRef.current = d.sheets;
    setSheets(parseSheets(d.sheets));
    setVersion(v => v + 1);
  }, []);

  useEffect(() => subscribeDoc(id, d => {
    docRef.current = d;
    setDocData(d);
    if (!d) return;
    const current = modeRef.current;
    if (current.kind === 'editing') {
      const other = meRef.current ? heldByOther(d.lock, meRef.current.uid) : null;
      if (other) {
        pendingRef.current = {};
        setMode({ kind: 'locked', by: other });
        setError(`${other.name || other.email} took over editing. Changes you hadn’t saved were not kept.`);
        showStored(d);
      }
      return;
    }
    showStored(d);
  }, () => setLoadError('This spreadsheet could not be loaded.')), [id, showStored]);

  // An uploaded Excel or CSV file: read it into the grid (read-only).
  const fileUrl = docData && isFile ? docData.fileUrl : '';
  const fileName = docData?.title ?? '';
  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    convertSheetFile(fileUrl, fileName).then(json => {
      if (cancelled) return;
      setSheets(parseSheets(json));
      setVersion(v => v + 1);
    }, e => { if (!cancelled) setFileError(e instanceof Error && e.message ? e.message : 'The file could not be shown here.'); });
    return () => { cancelled = true; };
  }, [fileUrl, fileName]);

  // Not shared with this person: back to Documents, with a toast saying so.
  const denied = !!docData && !!can && !can.canView;
  useEffect(() => { if (denied) router.replace(deniedHref(basePath, 'document')); }, [denied, router, basePath]);

  // ── One person edits at a time ──

  const acquire = useCallback(async (force = false) => {
    const viewer = meRef.current;
    if (!viewer) return;
    try {
      const result = await lockDoc(id, viewer, force);
      if (result.locked) {
        if (modeRef.current.kind !== 'editing' && docRef.current) showStored(docRef.current);
        setMode({ kind: 'editing' });
      } else {
        setMode(result.lock ? { kind: 'locked', by: result.lock } : { kind: 'view' });
      }
    } catch {
      setMode({ kind: 'view' });
    }
  }, [id, showStored]);

  const ready = !!docData && !!me;
  useEffect(() => {
    if (!ready) return;
    if (!canEdit || !wantEdit || isFile) {
      const t = setTimeout(() => setMode({ kind: 'view' }), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setMode({ kind: 'checking' }); void acquire(); }, 0);
    return () => clearTimeout(t);
  }, [ready, canEdit, wantEdit, isFile, acquire]);

  useEffect(() => {
    if (mode.kind !== 'editing' && mode.kind !== 'locked') return;
    const timer = setInterval(() => void acquire(), mode.kind === 'editing' ? LOCK_RENEW_MS : LOCK_RETRY_MS);
    return () => clearInterval(timer);
  }, [mode.kind, acquire]);

  useEffect(() => () => {
    const viewer = meRef.current;
    if (modeRef.current.kind !== 'editing' || !viewer) return;
    void flushRef.current().finally(() => releaseDoc(id, viewer));
  }, [id]);

  // ── Saving (automatic) ──

  const flush = useCallback(async () => {
    const viewer = meRef.current;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!viewer || modeRef.current.kind !== 'editing') return;
    if (savingRef.current) { timerRef.current = setTimeout(() => void flushRef.current(), 400); return; }
    const pending = pendingRef.current;
    if (!Object.keys(pending).length) return;
    pendingRef.current = {};
    savingRef.current = true;
    setSaveState('saving');
    try {
      const { sheets: sheetsChanged, ...fields } = pending;
      let json: string | undefined;
      if (sheetsChanged && latestRef.current) {
        json = JSON.stringify(compactSheets(latestRef.current));
        if (json === savedJsonRef.current) json = undefined;
      }
      if (json !== undefined || Object.keys(fields).length) {
        baseRef.current = await saveDoc(id, { ...fields, ...(json !== undefined ? { sheets: json } : {}) }, baseRef.current, viewer);
        if (json !== undefined) savedJsonRef.current = json;
      }
      setError('');
      setSaveState(Object.keys(pendingRef.current).length ? 'unsaved' : 'saved');
    } catch (err) {
      pendingRef.current = { ...pending, ...pendingRef.current };
      setSaveState('error');
      setError(err instanceof Error ? err.message : 'Your changes could not be saved.');
      if (err instanceof DocConflictError) setMode({ kind: 'view' });
    } finally {
      savingRef.current = false;
    }
  }, [id]);
  useEffect(() => { flushRef.current = flush; }, [flush]);

  function markChanged(changes: Pending) {
    pendingRef.current = { ...pendingRef.current, ...changes };
    setSaveState('unsaved');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flushRef.current(), AUTOSAVE_MS);
  }

  function setField<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(f => ({ ...f, [key]: value }));
    markChanged({ [key]: value } as Pending);
  }

  // The grid reports every change (and once as it loads): keep the latest, save shortly after.
  const onSheetsChange = useCallback((data: Sheet[]) => {
    latestRef.current = data;
    if (modeRef.current.kind !== 'editing') return;
    pendingRef.current = { ...pendingRef.current, sheets: true };
    setSaveState('unsaved');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flushRef.current(), AUTOSAVE_MS);
  }, []);

  /** Editing or Viewing; leaving Editing saves and lets someone else edit. */
  async function switchMode(next: 'editing' | 'viewing') {
    if (next === 'editing') { setWantEdit(true); return; }
    const viewer = meRef.current;
    if (modeRef.current.kind === 'editing' && viewer) {
      await flushRef.current();
      await releaseDoc(id, viewer).catch(() => undefined);
    }
    setWantEdit(false);
  }

  async function takeOver() {
    if (mode.kind !== 'locked') return;
    const ok = await confirm({
      title: `Take over from ${mode.by.name || mode.by.email}?`,
      message: 'They’ll switch to viewing, and anything they haven’t saved yet won’t be kept. Let them know first if you can.',
      confirmLabel: 'Take over editing',
    });
    if (ok) await acquire(true);
  }

  async function editUpload() {
    if (!docData || !me) return;
    const ok = await confirm({
      title: `Edit ${docData.title}?`,
      message: `It becomes a spreadsheet in the same place, shared the same way, and opens for editing. The original file stays available to download from the details. ${editNote(docData.title, docData.fileUrl)}${docData.owner.uid ? '' : ' It has no owner yet, so you’ll become its owner.'}`,
      confirmLabel: 'Edit it',
    });
    if (!ok) return;
    setConverting(true);
    setError('');
    try {
      await makeSheetEditable(id, me);
      setWantEdit(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'The file could not be opened for editing.');
    } finally {
      setConverting(false);
    }
  }

  async function remove() {
    if (!docData) return;
    const ok = await confirm({ title: `Delete “${docData.title}”?`, message: 'It’s removed for everyone, in AE Hub too. This can’t be undone.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      pendingRef.current = {};
      setMode({ kind: 'view' });
      await removeDoc(id);
      router.push(basePath);
    } catch {
      setError('The spreadsheet could not be deleted.');
    }
  }

  async function download(format: 'xlsx' | 'csv') {
    setDownloadOpen(false);
    const current = latestRef.current ? compactSheets(latestRef.current) : sheets;
    if (!current) return;
    const index = Math.max(0, current.findIndex(s => s.id && s.id === activeSheetRef.current));
    try {
      await downloadSheets(form.title || docData?.title || 'Spreadsheet', current, format, index);
    } catch {
      setError('The download could not be made. Please try again.');
    }
  }

  // ── Render ──

  if (loadError || docData === null) {
    return (
      <Centered>
        <FileSpreadsheet className="h-10 w-10 text-[#a3a3a3]" aria-hidden="true" />
        <p className="text-[16px] font-semibold text-[#292929] dark:text-white">{loadError || 'This spreadsheet doesn’t exist or was deleted.'}</p>
        <Link href={basePath} className="text-[14px] font-semibold text-[#806013] hover:underline dark:text-[#f5bd02]">Back to Documents</Link>
      </Centered>
    );
  }
  if (denied) return <Centered><Loader2 className="h-6 w-6 animate-spin text-[#a3a3a3]" aria-hidden="true" /></Centered>;

  const status = mode.kind === 'loading' || !docData ? 'Loading…'
    : isFile ? (sheets ? 'Uploaded file · read-only' : fileError ? 'Couldn’t open the file' : 'Opening the file…')
      : !editing ? (mode.kind === 'checking' ? 'Opening…' : canEdit && !wantEdit ? 'Viewing · switch to Editing to make changes' : 'Read-only')
        : saveState === 'saving' ? 'Saving…' : saveState === 'unsaved' ? 'Unsaved changes' : saveState === 'error' ? 'Not saved' : 'All changes saved';
  const panelField = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none focus:border-[#f5bd02] disabled:bg-[#f7f7f7] disabled:text-[#8a8a8a] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';
  const button = 'inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] font-medium text-[#292929] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/5';
  const gridReady = !!sheets && (isFile || mode.kind === 'editing' || mode.kind === 'view' || mode.kind === 'locked');

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      {/* Top bar: name (rename it here), save status, mode, download, details */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Link href={basePath} aria-label="Back to Documents" title="Back to Documents"
          className="rounded-lg p-2 text-[#656565] hover:bg-black/5 hover:text-[#1a1a1a] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <FileSpreadsheet className="hidden h-8 w-8 shrink-0 text-[#16a34a] sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input value={form.title} onChange={e => setField('title', e.target.value)} maxLength={160} aria-label="Spreadsheet name" placeholder="Untitled spreadsheet"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); } }}
              onBlur={() => { if (!form.title.trim()) setField('title', 'Untitled spreadsheet'); }}
              className="w-full max-w-[560px] truncate rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[18px] font-medium text-[#1a1a1a] outline-none placeholder:text-[#8a8a8a] hover:border-[#d4d4d4] focus:border-[#f5bd02] dark:text-white dark:hover:border-white/20" />
          ) : (
            <h1 className="truncate px-1.5 py-0.5 text-[18px] font-medium text-[#1a1a1a] dark:text-white">{form.title || docData?.title || 'Untitled spreadsheet'}</h1>
          )}
          <span className="flex items-center gap-1.5 px-1.5 text-[12px] text-[#8a8a8a]" aria-live="polite">
            {saveState === 'saving' && editing && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
            {saveState === 'saved' && editing && <Check className="h-3 w-3 text-green-600" aria-hidden="true" />}
            {saveState === 'error' && <CloudOff className="h-3 w-3 text-red-600" aria-hidden="true" />}
            {status}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isFile && canEdit && (
            <button type="button" onClick={() => void editUpload()} disabled={converting} title="Turn it into a spreadsheet you can edit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5bd02] px-3 py-2 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50">
              {converting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />} Edit
            </button>
          )}
          {canEdit && !isFile && (
            <div role="radiogroup" aria-label="Mode" className="flex rounded-lg border border-[#e5e5e5] bg-white p-0.5 dark:border-white/10 dark:bg-transparent">
              {([['editing', 'Editing', Pencil, 'Edit the spreadsheet'], ['viewing', 'Viewing', Eye, 'Look at it without the editing tools']] as const).map(([value, label, Icon, hint]) => {
                const on = value === 'editing' ? wantEdit : !wantEdit;
                return (
                  <button key={value} type="button" role="radio" aria-checked={on} title={hint} onClick={() => { if (!on) void switchMode(value); }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium ${on
                      ? 'bg-[#fef3c7] text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]' : 'text-[#525252] hover:bg-[#f5f5f5] dark:text-gray-300 dark:hover:bg-white/5'}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" /><span className="hidden md:inline">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
          {isFile && docData ? (
            <a href={fileDownloadHref(docData.fileUrl, docData.title)} download title="Download the original file" className={button}>
              <Download className="h-4 w-4" aria-hidden="true" /> Download
            </a>
          ) : (
            <div className="relative">
              <button type="button" onClick={() => setDownloadOpen(v => !v)} aria-expanded={downloadOpen} disabled={!sheets} className={button}>
                <Download className="h-4 w-4" aria-hidden="true" /> Download <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {downloadOpen && (
                <div className="absolute right-0 top-full z-[1100] mt-1 w-60 rounded-lg border border-[#e5e5e5] bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#1e1e1e]" onMouseLeave={() => setDownloadOpen(false)}>
                  {/* The type it came as first (an uploaded .csv downloads as .csv), then the other */}
                  {(docData && defaultSheetFormat(docData) === 'csv' ? (['csv', 'xlsx'] as const) : (['xlsx', 'csv'] as const)).map(format => (
                    <button key={format} type="button" onClick={() => void download(format)} className="block w-full px-3 py-2 text-left text-[13px] text-[#292929] hover:bg-[#f5f5f5] dark:text-gray-200 dark:hover:bg-white/5">
                      {format === 'xlsx' ? 'Excel workbook (.xlsx)' : 'CSV (the sheet you’re on)'}
                      {docData?.originalFile && format === defaultSheetFormat(docData) ? <span className="block text-[11px] text-[#8a8a8a]">Same type as the uploaded file</span> : null}
                    </button>
                  ))}
                  {docData?.originalFile && (
                    <a href={fileDownloadHref(docData.originalFile.url, docData.originalFile.name)} download onClick={() => setDownloadOpen(false)}
                      className="block w-full border-t border-[#f0f0f0] px-3 py-2 text-left text-[13px] text-[#292929] hover:bg-[#f5f5f5] dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">
                      Original upload ({docData.originalFile.name})
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={() => setPanelOpen(v => !v)} aria-expanded={panelOpen} className={button}>
            {panelOpen ? <PanelRightClose className="h-4 w-4" aria-hidden="true" /> : <PanelRightOpen className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      {fileError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{fileError} You can still download it.</p>}
      {isFile && canEdit && !fileError && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-4 py-2.5 text-[13px] text-[#525252] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-300">
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" /> This is the uploaded file, shown read-only. Choose Edit to turn it into a spreadsheet you can change.
        </p>
      )}
      {!isFile && mode.kind === 'view' && can && !can.canEdit && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-4 py-2.5 text-[13px] text-[#525252] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-300">
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" /> You can view this spreadsheet. Only {docData?.owner.name || 'its owner'} can edit it{docData?.othersCanEdit ? '' : ' unless they let others edit'}.
        </p>
      )}
      {mode.kind === 'locked' && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1"><strong className="font-semibold">{mode.by.name || mode.by.email}</strong> is editing this spreadsheet, so it’s read-only for you. It updates when they save and opens for editing when they’re done.</span>
          {docData && me && docData.owner.uid === me.uid && (
            <button type="button" onClick={() => void takeOver()} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold hover:bg-amber-100 dark:bg-transparent">Take over</button>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 ${panelOpen ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : ''}`}>
        {/* The grid; remounted when switching mode or when the stored sheets change from outside */}
        <div className="ae-sheet h-[calc(100vh-230px)] min-h-[460px] overflow-hidden rounded-xl border border-[#e5e5e5] bg-white dark:border-white/10">
          {gridReady && sheets ? (
            <Workbook key={`${version}-${editing ? 'edit' : 'view'}`} data={prepareSheets(sheets)} onChange={onSheetsChange}
              allowEdit={editing} showToolbar={editing} showFormulaBar showSheetTabs lang="en" forceCalculation
              toolbarItems={TOOLBAR} cellContextMenu={editing ? CELL_MENU : []} headerContextMenu={editing ? undefined : []} sheetTabContextMenu={editing ? undefined : []}
              hooks={{ afterActivateSheet: sheetId => { activeSheetRef.current = sheetId; } }} />
          ) : (
            <div className="flex h-full items-center justify-center">
              {fileError ? <FileSpreadsheet className="h-10 w-10 text-[#d4d4d4]" aria-hidden="true" /> : <Loader2 className="h-6 w-6 animate-spin text-[#a3a3a3]" aria-hidden="true" />}
            </div>
          )}
        </div>

        {panelOpen && docData && me && can && (
          <aside className="space-y-4 xl:self-start">
            <section className="space-y-4 rounded-xl border border-[#e5e5e5] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
              <h2 className="text-[14px] font-semibold text-[#292929] dark:text-white">Details</h2>
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Category</span>
                <select className={panelField} value={form.category} disabled={!editing} onChange={e => setField('category', e.target.value)}>
                  {!DOC_CATEGORIES.includes(form.category) && <option>{form.category}</option>}
                  {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Description</span>
                <textarea className={`${panelField} min-h-[64px]`} value={form.description} maxLength={300} disabled={!editing} onChange={e => setField('description', e.target.value)} />
              </label>
            </section>
            <section className="space-y-4 rounded-xl border border-[#e5e5e5] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
              <h2 className="text-[14px] font-semibold text-[#292929] dark:text-white">Sharing</h2>
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Who can see it</span>
                <select className={panelField} value={form.share} disabled={!editing || !can.canShare} onChange={e => {
                  const share = e.target.value as DocShare;
                  setField('share', share);
                  if (share === 'departments' && !form.sharedDepartments.length && docData.aeDepartmentId) {
                    setField('sharedDepartments', [{ id: docData.aeDepartmentId, name: docData.aeDepartmentName }]);
                  }
                }}>
                  {(Object.keys(SHARE_LABELS) as DocShare[]).filter(s => s !== 'department' || me.department || form.share === 'department').map(s => (
                    <option key={s} value={s}>{s === 'department' && docData.aeDepartmentName ? `The ${docData.aeDepartmentName} team` : SHARE_LABELS[s]}</option>
                  ))}
                </select>
              </label>
              {form.share === 'departments' && (
                <DepartmentPicker value={form.sharedDepartments} disabled={!editing || !can.canShare} ownTeamId={me.aeDepartmentId}
                  onChange={next => setField('sharedDepartments', next)} />
              )}
              <label className="flex items-start gap-2 text-[13px] text-[#525252] dark:text-gray-300">
                <input type="checkbox" checked={form.othersCanEdit} disabled={!editing || !can.canShare || form.share === 'private'} onChange={e => setField('othersCanEdit', e.target.checked)} className="mt-0.5 accent-[#f5bd02]" />
                <span>Others can edit<span className="block text-[12px] text-[#8a8a8a]">Everyone who can see it can change it, one person at a time.</span></span>
              </label>
              {!can.canShare && <p className="text-[12px] text-[#8a8a8a]">Only the owner changes who can see or edit it.</p>}
            </section>
            <section className="space-y-2 rounded-xl border border-[#e5e5e5] bg-white p-5 text-[13px] text-[#525252] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-300">
              <p><span className="text-[#8a8a8a]">Owner:</span> {docData.owner.name || docData.owner.email || 'No owner yet'}{docData.owner.uid && docData.owner.uid === me.uid ? ' (you)' : ''}</p>
              {docData.updatedAt && <p><span className="text-[#8a8a8a]">Last edited:</span> {new Date(docData.updatedAt).toLocaleString()}{docData.updatedBy ? ` by ${docData.updatedBy}` : ''}</p>}
              {docData.originalFile && (
                <p><span className="text-[#8a8a8a]">Uploaded as:</span>{' '}
                  <a href={fileDownloadHref(docData.originalFile.url, docData.originalFile.name)} download className="font-medium text-[#806013] hover:underline dark:text-[#f5bd02]">{docData.originalFile.name}</a>
                </p>
              )}
              {!isFile && sheets && (
                <SaveTemplateButton me={me} kind="sheet" title={form.title || docData.title} category={form.category}
                  body={() => JSON.stringify(latestRef.current ? compactSheets(latestRef.current) : sheets)} />
              )}
              {can.canDelete && (
                <button type="button" onClick={() => void remove()} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete spreadsheet
                </button>
              )}
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">{children}</div>;
}
