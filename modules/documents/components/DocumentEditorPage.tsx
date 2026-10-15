'use client';

/**
 * A written document (/ws/documents/[id], and /ceo/documents/[id] for the
 * CEO): the Google Docs-style editor from the article editor on a page,
 * saving automatically. People who can't edit, or who open it while someone
 * else is editing, read it (it updates live and opens for editing once free).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { CellSelection } from '@tiptap/pm/tables';
import {
  ArrowLeft, Bold, Check, ChevronDown, CloudOff, Download, Eye, FileText, Highlighter, Italic, Link2, Loader2, Lock,
  PanelRightClose, PanelRightOpen, Pencil, Printer, RectangleHorizontal, RectangleVertical, RemoveFormatting, Replace, Trash2, Underline, Unlink,
} from 'lucide-react';
import AeModal, { useConfirm } from '@/app/components/common/AeModal';
import { useAuth } from '@/lib/workstation/auth-context';
import { deniedHref } from '@/lib/workstation/access-denied';
import { subscribeUserProfile } from '@/modules/settings/services';
import { articleExtensions } from '@/app/components/cpanel/article/extensions';
import Toolbar, { Divider, ToolButton, applyFontSize, clearFormatting, currentFontSize } from '@/app/components/cpanel/article/Toolbar';
import TableMenu, { tableElement } from '@/app/components/cpanel/article/TableMenu';
import FindReplace from '@/app/components/cpanel/article/FindReplace';
import { SpecialCharsDialog, WordCountDialog } from '@/app/components/cpanel/article/ToolDialogs';
import LinkDialog, { type LinkTarget } from '@/app/components/cpanel/article/LinkDialog';
import ImageDialog, { type ArticleImage } from '@/app/components/cpanel/article/ImageDialog';
import { articleFontsUrl } from '@/backend/modules/site-content/site-content.types';
import DepartmentPicker from './DepartmentPicker';
import SaveTemplateButton from './SaveTemplateButton';
import ProjectPicker from './ProjectPicker';
import {
  DOC_CATEGORIES, DocConflictError, type DocOrientation, type SharedDepartment, DOC_FORMATS, defaultDocFormat, downloadDocument, heldByOther, lockDoc, permissionsOf, printDoc, releaseDoc,
  removeDoc, saveDoc, shareOf, subscribeDoc, uploadDocImage, type DocLock, type DocShare, type Viewer, type WorkDoc,
  convertFile, editNote, type DocProject, fileDownloadHref, isEditableFile, isPreviewableFile, makeEditable,
} from '../doc-store';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const AUTOSAVE_MS = 1500;
const LOCK_RENEW_MS = 60_000;
const LOCK_RETRY_MS = 20_000;

type Mode = { kind: 'loading' } | { kind: 'checking' } | { kind: 'editing' } | { kind: 'locked'; by: DocLock } | { kind: 'view' };
type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';
type LinkState = { from: number; to: number; href: string; newTab: boolean; selectedText: string; editing: boolean };
type ImageState = { mode: 'insert' | 'replace' | 'details'; pos: number; initial?: { alt: string; caption: string; showCaption: boolean } };
interface Form { title: string; category: string; description: string; share: DocShare; othersCanEdit: boolean; sharedDepartments: SharedDepartment[]; orientation: DocOrientation; project: DocProject | null }
type Pending = Partial<Form> & { content?: boolean };

const SHARE_LABELS: Record<DocShare, string> = { private: 'Only me', department: 'My department', departments: 'Departments I choose…', all: 'Everyone in the company' };

const formOf = (d: WorkDoc): Form => ({ title: d.title, category: d.category, description: d.description, share: shareOf(d), othersCanEdit: d.othersCanEdit, sharedDepartments: d.sharedDepartments, orientation: d.orientation, project: d.project });
const timeAgo = (iso: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl + S', 'Save now (it also saves as you type)'],
  ['Ctrl + P', 'Print or save as PDF'],
  ['Ctrl + B / I / U', 'Bold, italic, underline'],
  ['Ctrl + K', 'Add or edit a link'],
  ['Ctrl + Shift + . / ,', 'Bigger / smaller text'],
  ['Ctrl + Shift + 7 / 8 / 9', 'Numbered list, bullets, checklist'],
  ['Ctrl + ] / Ctrl + [', 'Indent / outdent'],
  ['Ctrl + F / Ctrl + H', 'Find / find and replace'],
  ['Ctrl + Shift + C', 'Word count'],
  ['Ctrl + \\', 'Clear formatting'],
  ['## then space', 'Heading 1'],
  ['[ ] then space', 'Checklist'],
];

export default function DocumentEditorPage({ id, basePath, isCeo, aeDepartmentId = '', startInView = false }: {
  id: string; basePath: string; isCeo: boolean;
  /** The viewer's AE department, for documents kept under its team. */
  aeDepartmentId?: string;
  /** Open in Viewing mode even for someone who can edit (?mode=view). */
  startInView?: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [department, setDepartment] = useState<string | null>(null);
  const [docData, setDocData] = useState<WorkDoc | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'loading' });
  const [form, setForm] = useState<Form>({ title: '', category: 'General', description: '', share: 'department', othersCanEdit: false, sharedDepartments: [], orientation: 'portrait', project: null });
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(true);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [linkDialog, setLinkDialog] = useState<LinkState | null>(null);
  const [imageDialog, setImageDialog] = useState<ImageState | null>(null);
  const [find, setFind] = useState<{ replace: boolean } | null>(null);
  const [specialChars, setSpecialChars] = useState(false);
  const [wordCount, setWordCount] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [spellcheck, setSpellcheck] = useState(true);
  const [words, setWords] = useState(0);
  const [uploads, setUploads] = useState(0);
  // An uploaded file (not written here) is shown read-only, converted on the fly; Edit makes it a written document.
  const [preview, setPreview] = useState<{ html: string } | { error: string } | null>(null);
  const [converting, setConverting] = useState(false);
  const previewRef = useRef<string | null>(null);

  const docRef = useRef<WorkDoc | null>(null);
  const baseRef = useRef('');
  const pendingRef = useRef<Pending>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const modeRef = useRef<Mode>(mode);
  const viewRef = useRef({ zoom: 100, spellcheck: true });
  const dropRef = useRef<(files: File[], pos: number) => void>(() => undefined);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const me: Viewer | null = user && department !== null
    ? { uid: user.uid, name: user.displayName || user.email || 'Team member', email: user.email || '', department, isCeo, aeDepartmentId }
    : null;
  const meRef = useRef(me);
  useEffect(() => { meRef.current = me; });
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const can = docData && me ? permissionsOf(docData, me) : null;
  const editing = mode.kind === 'editing';
  // Reading (a viewer, or while someone else edits): the document as it is, without editing tools.
  const reading = mode.kind === 'view' || mode.kind === 'locked';

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: articleExtensions('Start writing… Type ## and a space for a heading, or paste an image.'),
    content: '',
    editorProps: {
      attributes: () => ({
        class: 'article-content article-editor ProseMirror min-h-[60vh] px-5 py-8 sm:px-10 md:min-h-[900px] md:px-16 md:py-14',
        'aria-label': 'Document',
        spellcheck: String(viewRef.current.spellcheck),
        style: viewRef.current.zoom === 100 ? '' : `zoom: ${viewRef.current.zoom / 100}`,
      }),
      handleDrop: (view, event, _slice, moved) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter(f => IMAGE_TYPES.includes(f.type));
        if (moved || files.length === 0 || !view.editable) return false;
        event.preventDefault();
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
        dropRef.current(files, at?.pos ?? view.state.selection.from);
        return true;
      },
      handlePaste: (view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter(f => IMAGE_TYPES.includes(f.type));
        if (files.length === 0 || !view.editable) return false;
        event.preventDefault();
        dropRef.current(files, view.state.selection.from);
        return true;
      },
    },
    onUpdate: ({ editor: e, transaction }) => {
      setWords(e.getText().split(/\s+/).filter(Boolean).length);
      if (transaction.getMeta('loading')) return;
      if (modeRef.current.kind === 'editing' && e.isEditable) markChanged({ content: true });
    },
  });

  // ── Loading ──

  useEffect(() => (user?.uid
    ? subscribeUserProfile(user.uid, p => setDepartment(String(p?.department ?? '').toLowerCase()), () => setDepartment(''))
    : undefined), [user?.uid]);

  /** Shows the stored document (when not editing it, and when editing starts). */
  const showStored = useCallback((d: WorkDoc) => {
    if (!editor || editor.isDestroyed) return;
    // Loading isn't an edit: no save, and nothing to undo back past.
    const content = d.written ? d.content : previewRef.current ?? '';
    editor.chain().setMeta('addToHistory', false).setContent(content || '<p></p>', { emitUpdate: false }).run();
    setWords(editor.getText().split(/\s+/).filter(Boolean).length);
    setForm(formOf(d));
    baseRef.current = d.updatedAt;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    return subscribeDoc(id, d => {
      docRef.current = d;
      setDocData(d);
      if (!d) return;
      const current = modeRef.current;
      if (current.kind === 'editing') {
        // Someone (the owner) took over: stop editing.
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
    }, () => setLoadError('This document could not be loaded.'));
  }, [editor, id, showStored]);

  const isFile = !!docData && !docData.written;
  const previewable = !!docData && isFile && isPreviewableFile(docData.fileName);
  const fileUrl = docData && isFile ? docData.fileUrl : '';
  const fileName = docData?.fileName ?? '';
  useEffect(() => {
    if (!previewable || !fileUrl) return;
    let cancelled = false;
    convertFile(fileUrl, fileName).then(html => {
      if (cancelled) return;
      previewRef.current = html;
      setPreview({ html });
      if (docRef.current) showStored(docRef.current);
    }, e => {
      if (!cancelled) setPreview({ error: e instanceof Error && e.message ? e.message : 'The file could not be shown here.' });
    });
    return () => { cancelled = true; };
  }, [previewable, fileUrl, fileName, showStored]);

  // ── Edit lock: one person edits at a time ──

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

  const ready = !!docData && !!me && !!editor;
  const canEdit = !!can?.canEdit;
  // Editing or Viewing, as in Google Docs: whoever can edit chooses; everyone else views.
  const [wantEdit, setWantEdit] = useState(!startInView);
  useEffect(() => {
    if (!ready) return;
    // An uploaded file is only ever read here (Edit turns it into a written document first).
    if (!canEdit || !wantEdit || isFile) {
      const t = setTimeout(() => setMode({ kind: 'view' }), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setMode({ kind: 'checking' }); void acquire(); }, 0);
    return () => clearTimeout(t);
  }, [ready, canEdit, wantEdit, isFile, acquire]);

  /** Turns the uploaded file into a written document (same place, same sharing) and starts editing it. */
  async function editUpload() {
    if (!docData || !me) return;
    const ok = await confirm({
      title: `Edit ${docData.title}?`,
      message: `It becomes a written document in the same place, shared the same way, and opens for editing. The original file stays available to download from the details. ${editNote(docData.fileName)}${docData.owner.uid ? '' : ' It has no owner yet, so you’ll become its owner.'}`,
      confirmLabel: 'Edit it',
    });
    if (!ok) return;
    setConverting(true);
    setError('');
    try {
      await makeEditable(id, me);
      setWantEdit(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'The file could not be opened for editing.');
    } finally {
      setConverting(false);
    }
  }

  /** Switches between Editing and Viewing; leaving Editing saves and lets someone else edit. */
  async function switchMode(next: 'editing' | 'viewing') {
    if (next === 'editing') { setWantEdit(true); return; }
    const viewer = meRef.current;
    if (modeRef.current.kind === 'editing' && viewer) {
      await flushRef.current();
      await releaseDoc(id, viewer).catch(() => undefined);
    }
    setWantEdit(false);
  }

  useEffect(() => {
    if (mode.kind !== 'editing' && mode.kind !== 'locked') return;
    const timer = setInterval(() => void acquire(), mode.kind === 'editing' ? LOCK_RENEW_MS : LOCK_RETRY_MS);
    return () => clearInterval(timer);
  }, [mode.kind, acquire]);

  // Leaving: save what's left and let go of the lock.
  useEffect(() => () => {
    const viewer = meRef.current;
    if (modeRef.current.kind !== 'editing' || !viewer) return;
    void flushRef.current().finally(() => releaseDoc(id, viewer));
  }, [id]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isEditable !== editing) editor.setEditable(editing, false); // not an edit
  }, [editor, editing]);

  useEffect(() => {
    viewRef.current = { zoom, spellcheck };
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false).setMeta('loading', true));
  }, [editor, zoom, spellcheck]);

  // ── Saving (automatic) ──

  const flush = useCallback(async () => {
    const viewer = meRef.current;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!viewer || !editor || editor.isDestroyed || modeRef.current.kind !== 'editing') return;
    if (savingRef.current) { timerRef.current = setTimeout(() => void flushRef.current(), 400); return; }
    const pending = pendingRef.current;
    if (!Object.keys(pending).length) return;
    pendingRef.current = {};
    savingRef.current = true;
    setSaveState('saving');
    try {
      const { content, ...fields } = pending;
      baseRef.current = await saveDoc(id, { ...fields, ...(content ? { content: editor.getHTML() } : {}) }, baseRef.current, viewer);
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
  }, [editor, id]);
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

  useEffect(() => {
    if (saveState === 'saved') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  // ── Links and images ──

  const openLink = useCallback(() => {
    if (!editor) return;
    const inLink = editor.isActive('link');
    if (inLink) editor.commands.extendMarkRange('link');
    const { from, to } = editor.state.selection;
    const attrs = editor.getAttributes('link');
    setLinkDialog({ from, to, href: inLink ? String(attrs.href ?? '') : '', newTab: attrs.target === '_blank', selectedText: editor.state.doc.textBetween(from, to, ' '), editing: inLink });
  }, [editor]);

  function applyLink(link: LinkTarget) {
    if (!editor || !linkDialog) return;
    const { from, to, selectedText } = linkDialog;
    const attrs = { href: link.href, target: link.newTab ? '_blank' : null };
    const chain = editor.chain().focus();
    if (link.text && link.text !== selectedText) {
      chain.insertContentAt({ from, to }, { type: 'text', text: link.text, marks: [{ type: 'link', attrs }] }).setTextSelection(from + link.text.length);
    } else {
      chain.setTextSelection({ from, to }).setLink(attrs).setTextSelection(to);
    }
    chain.unsetMark('link').scrollIntoView().run();
    setLinkDialog(null);
  }

  function removeLink() {
    if (!editor || !linkDialog) return;
    editor.chain().focus().setTextSelection({ from: linkDialog.from, to: linkDialog.to }).unsetLink().setTextSelection(linkDialog.to).scrollIntoView().run();
    setLinkDialog(null);
  }

  const upload = useCallback((file: File, name?: string) => {
    if (!meRef.current) return Promise.reject(new Error('Sign in again to add images.'));
    return uploadDocImage(file, meRef.current, name);
  }, []);

  function selectedImage() {
    if (!editor || !editor.isActive('image')) return null;
    const attrs = editor.getAttributes('image');
    return { pos: editor.state.selection.from, alt: String(attrs.alt ?? ''), caption: String(attrs.caption ?? ''), showCaption: attrs.showCaption !== false };
  }

  function placeImage(image: ArticleImage) {
    if (!editor || !imageDialog) return;
    const { mode: m, pos } = imageDialog;
    const details = { alt: image.alt, caption: image.caption, showCaption: image.showCaption };
    if (m === 'insert') editor.chain().focus().setTextSelection(pos).insertContent({ type: 'image', attrs: { src: image.src, ...details } }).scrollIntoView().run();
    else editor.chain().focus().setNodeSelection(pos).updateAttributes('image', m === 'details' ? details : { src: image.src, ...details }).scrollIntoView().run();
    setImageDialog(null);
  }

  const uploadDropped = useCallback((files: File[], pos: number) => {
    if (!editor) return;
    setUploads(n => n + files.length);
    void (async () => {
      let at = pos;
      for (const file of files) {
        try {
          const src = await upload(file, file.name);
          const alt = file.name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ').trim();
          editor.chain().setTextSelection(Math.min(at, editor.state.doc.content.size)).insertContent({ type: 'image', attrs: { src, alt, caption: '' } }).run();
          at = editor.state.selection.to;
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An image could not be uploaded.');
        } finally {
          setUploads(n => n - 1);
        }
      }
    })();
  }, [editor, upload]);
  useEffect(() => { dropRef.current = uploadDropped; }, [uploadDropped]);

  // ── Shortcuts ──

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !editor) return;
      const key = e.key.toLowerCase();
      const run = (action: () => void) => { e.preventDefault(); action(); };
      if (key === 's') return run(() => void flushRef.current());
      if (key === 'p' && !e.shiftKey) return run(() => printDoc(form.title, editor.getHTML(), form.orientation));
      if (!editor.isFocused) return;
      if (key === 'f' && !e.shiftKey) run(() => setFind({ replace: false }));
      else if (key === '/') run(() => setShortcuts(true));
      else if (e.shiftKey && key === 'c') run(() => setWordCount(true));
      if (!editor.isEditable) return;
      if (key === 'k') run(openLink);
      else if (key === 'h') run(() => setFind({ replace: true }));
      else if (e.shiftKey && (key === '>' || key === '.')) run(() => applyFontSize(editor, currentFontSize(editor) + 1));
      else if (e.shiftKey && (key === '<' || key === ',')) run(() => applyFontSize(editor, currentFontSize(editor) - 1));
      else if (key === '\\') run(() => clearFormatting(editor));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, form.title, form.orientation, openLink]);

  // ── Actions ──

  async function takeOver() {
    if (mode.kind !== 'locked') return;
    const ok = await confirm({
      title: `Take over from ${mode.by.name || mode.by.email}?`,
      message: 'They’ll switch to reading, and anything they haven’t saved yet won’t be kept. Let them know first if you can.',
      confirmLabel: 'Take over editing',
    });
    if (ok) await acquire(true);
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
      setError('The document could not be deleted.');
    }
  }

  // Not shared with this person (or their department): back to Documents, with a toast saying so.
  const denied = !!docData && !!can && !can.canView;
  useEffect(() => {
    if (denied) router.replace(deniedHref(basePath, 'document'));
  }, [denied, router, basePath]);

  // ── Render ──

  if (loadError || docData === null) {
    return (
      <Centered>
        <FileText className="h-10 w-10 text-[#a3a3a3]" aria-hidden="true" />
        <p className="text-[16px] font-semibold text-[#292929] dark:text-white">{loadError || 'This document doesn’t exist or was deleted.'}</p>
        <Link href={basePath} className="text-[14px] font-semibold text-[#806013] hover:underline dark:text-[#f5bd02]">Back to Documents</Link>
      </Centered>
    );
  }
  if (docData && can && !can.canView) {
    // Sent back to Documents (see the effect above), where a toast says why.
    return <Centered><Loader2 className="h-6 w-6 animate-spin text-[#a3a3a3]" aria-hidden="true" /></Centered>;
  }

  // PDFs, images and other files open in the browser's own viewer, which shows them as they are.
  if (docData && isFile && !previewable) {
    return (
      <Centered>
        <FileText className="h-10 w-10 text-[#a3a3a3]" aria-hidden="true" />
        <p className="text-[16px] font-semibold text-[#292929] dark:text-white">{docData.title}</p>
        <p className="max-w-md text-[14px] text-[#656565] dark:text-gray-400">This file opens in your browser’s own viewer.</p>
        {error && <p role="alert" className="max-w-md text-[13px] text-red-600">{error}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          {docData.fileUrl && (
            <a href={docData.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90">
              <Eye className="h-4 w-4" aria-hidden="true" /> Open the file
            </a>
          )}
          {docData.fileUrl && (
            <a href={fileDownloadHref(docData.fileUrl, docData.fileName)} download className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#292929] hover:bg-[#f5f5f5] dark:border-white/10 dark:text-gray-200">
              <Download className="h-4 w-4" aria-hidden="true" /> Download
            </a>
          )}
          {canEdit && isEditableFile(docData.fileName) && (
            <button type="button" onClick={() => void editUpload()} disabled={converting} className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#292929] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:text-gray-200">
              {converting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />} Edit
            </button>
          )}
        </div>
        <Link href={basePath} className="text-[14px] font-semibold text-[#806013] hover:underline dark:text-[#f5bd02]">Back to Documents</Link>
      </Centered>
    );
  }

  const status = mode.kind === 'loading' || !docData ? 'Loading…'
    : isFile ? (previewable && !preview ? 'Opening the file…' : 'Uploaded file · read-only')
    : !editing ? (mode.kind === 'checking' ? 'Opening…' : canEdit && !wantEdit ? 'Viewing · switch to Editing to make changes' : 'Read-only')
      : saveState === 'saving' ? 'Saving…' : saveState === 'unsaved' ? 'Unsaved changes' : saveState === 'error' ? 'Not saved' : 'All changes saved';
  // Floating menus wrap on narrow screens instead of running off them.
  const bubble = 'z-10 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-0.5 rounded-lg bg-[#1F1F1F] p-1 shadow-xl';
  const panelField = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none focus:border-[#f5bd02] disabled:bg-[#f7f7f7] disabled:text-[#8a8a8a] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <link rel="stylesheet" href={articleFontsUrl()} precedence="default" />

      {/* Top bar: the document's name (rename it here, as in Google Docs) and its save status */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Link href={basePath} aria-label="Back to Documents" title="Back to Documents"
          className="rounded-lg p-2 text-[#656565] hover:bg-black/5 hover:text-[#1a1a1a] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <FileText className="hidden h-8 w-8 shrink-0 text-[#2563eb] sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input value={form.title} onChange={e => setField('title', e.target.value)} maxLength={160} aria-label="Document name" placeholder="Untitled document"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); editor?.commands.focus(); } }}
              onBlur={() => { if (!form.title.trim()) setField('title', 'Untitled document'); }}
              className="w-full max-w-[560px] truncate rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[18px] font-medium text-[#1a1a1a] outline-none placeholder:text-[#8a8a8a] hover:border-[#d4d4d4] focus:border-[#f5bd02] dark:text-white dark:hover:border-white/20" />
          ) : (
            <h1 className="truncate px-1.5 py-0.5 text-[18px] font-medium text-[#1a1a1a] dark:text-white">{form.title || docData?.title || 'Untitled document'}</h1>
          )}
          <span className="flex items-center gap-1.5 px-1.5 text-[12px] text-[#8a8a8a]" aria-live="polite">
            {saveState === 'saving' && editing && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
            {saveState === 'saved' && editing && <Check className="h-3 w-3 text-green-600" aria-hidden="true" />}
            {saveState === 'error' && <CloudOff className="h-3 w-3 text-red-600" aria-hidden="true" />}
            {status}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* An uploaded file: Edit turns it into a document you can change */}
          {isFile && canEdit && (
            <button type="button" onClick={() => void editUpload()} disabled={converting} title="Turn it into a document you can edit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5bd02] px-3 py-2 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50">
              {converting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />} Edit
            </button>
          )}
          {/* Editing or Viewing, for whoever can edit */}
          {canEdit && !isFile && (
            <div role="radiogroup" aria-label="Mode" className="flex rounded-lg border border-[#e5e5e5] bg-white p-0.5 dark:border-white/10 dark:bg-transparent">
              {([['editing', 'Editing', Pencil, 'Edit the document'], ['viewing', 'Viewing', Eye, 'Read it without the editing tools']] as const).map(([value, label, Icon, hint]) => {
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
          {/* Page setup: portrait or landscape */}
          <div role="radiogroup" aria-label="Page orientation" className="flex rounded-lg border border-[#e5e5e5] bg-white p-0.5 dark:border-white/10 dark:bg-transparent">
            {([['portrait', 'Portrait', RectangleVertical], ['landscape', 'Landscape', RectangleHorizontal]] as const).map(([value, label, Icon]) => (
              <button key={value} type="button" role="radio" aria-checked={form.orientation === value} title={editing ? label : `${label} (only people who can edit change it)`}
                disabled={!editing} onClick={() => setField('orientation', value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium disabled:cursor-default ${form.orientation === value
                  ? 'bg-[#fef3c7] text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]' : 'text-[#525252] hover:bg-[#f5f5f5] disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-white/5'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" /><span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
          {isFile && docData ? (
            <a href={fileDownloadHref(docData.fileUrl, docData.fileName)} download title="Download the original file"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] font-medium text-[#292929] hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/5">
              <Download className="h-4 w-4" aria-hidden="true" /> Download
            </a>
          ) : (
          <div className="relative">
            <button type="button" onClick={() => setDownloadOpen(v => !v)} aria-expanded={downloadOpen} disabled={!editor}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] font-medium text-[#292929] hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/5">
              <Download className="h-4 w-4" aria-hidden="true" /> Download <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {downloadOpen && editor && (
              <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-[#e5e5e5] bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#1e1e1e]" onMouseLeave={() => setDownloadOpen(false)}>
                {/* The type it came as first (an uploaded .docx downloads as .docx), then the others */}
                {docData && [...DOC_FORMATS].sort((a, b) => Number(b.id === defaultDocFormat(docData)) - Number(a.id === defaultDocFormat(docData))).map(item => (
                  <button key={item.id} type="button" onClick={() => {
                    setDownloadOpen(false);
                    void downloadDocument(form.title, editor.getHTML(), form.orientation, item.id).catch(e => setError(e instanceof Error ? e.message : 'The download could not be made.'));
                  }}
                    className="block w-full px-3 py-2 text-left text-[13px] text-[#292929] hover:bg-[#f5f5f5] dark:text-gray-200 dark:hover:bg-white/5">
                    {item.label}{docData.originalFile && item.id === defaultDocFormat(docData) ? <span className="block text-[11px] text-[#8a8a8a]">Same type as the uploaded file</span> : null}
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
          <button type="button" onClick={() => editor && printDoc(form.title, editor.getHTML(), form.orientation)} title="Print (Ctrl+P)" aria-label="Print"
            className="rounded-lg border border-[#e5e5e5] bg-white p-2 text-[#525252] hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5">
            <Printer className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setPanelOpen(v => !v)} aria-expanded={panelOpen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] font-medium text-[#292929] hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/5">
            {panelOpen ? <PanelRightClose className="h-4 w-4" aria-hidden="true" /> : <PanelRightOpen className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      {isFile && preview && 'error' in preview && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {preview.error}{' '}
          {docData?.fileUrl && <a href={docData.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Open the file</a>} or download it.
        </p>
      )}
      {isFile && can?.canEdit && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-4 py-2.5 text-[13px] text-[#525252] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-300">
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" /> This is the uploaded file, shown read-only. Choose Edit to turn it into a document you can change.
        </p>
      )}
      {mode.kind === 'view' && can && !can.canEdit && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-4 py-2.5 text-[13px] text-[#525252] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-300">
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" /> You can read this document. Only {docData?.owner.name || 'its owner'} can edit it{docData?.othersCanEdit ? '' : ' unless they let others edit'}.
        </p>
      )}
      {mode.kind === 'locked' && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1"><strong className="font-semibold">{mode.by.name || mode.by.email}</strong> is editing this document, so it’s read-only for you. It updates as they type and opens for editing when they’re done.</span>
          {docData && me && docData.owner.uid === me.uid && (
            <button type="button" onClick={() => void takeOver()} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-semibold hover:bg-amber-100 dark:bg-transparent">Take over</button>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-5 ${panelOpen ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
        <div className="min-w-0 overflow-visible rounded-xl border border-[#e5e5e5] bg-[#f1f0ec] dark:border-white/10 dark:bg-[#151515]">
          {editor && editing && (
            <>
              <Toolbar editor={editor} onLink={openLink} onImage={() => setImageDialog({ mode: 'insert', pos: editor.state.selection.from })} onShortcuts={() => setShortcuts(true)}
                onFind={replace => setFind({ replace })} onSpecialChars={() => setSpecialChars(true)} onWordCount={() => setWordCount(true)}
                zoom={zoom} onZoom={setZoom} spellcheck={spellcheck} onSpellcheck={setSpellcheck}
                panelHidden={!panelOpen} onTogglePanel={() => setPanelOpen(v => !v)} />
              <TextBubble editor={editor} bubble={bubble} onLink={openLink} />
              <BubbleMenu editor={editor} pluginKey="docLinkMenu" className={bubble} shouldShow={({ editor: e, from, to }) => from === to && e.isActive('link')}>
                <a href={String(editor.getAttributes('link').href ?? '')} target="_blank" rel="noopener noreferrer" className="max-w-[220px] truncate px-2 text-[13px] text-white/90 underline underline-offset-2 hover:text-white">
                  {String(editor.getAttributes('link').href ?? '')}
                </a>
                <Divider dark />
                <ToolButton dark label="Edit link" onClick={openLink}><Pencil className="h-4 w-4" /></ToolButton>
                <ToolButton dark label="Remove link" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}><Unlink className="h-4 w-4" /></ToolButton>
              </BubbleMenu>
              <BubbleMenu editor={editor} pluginKey="docImageMenu" className={bubble} shouldShow={({ editor: e }) => e.isActive('image')}>
                <button type="button" onMouseDown={e => e.preventDefault()} className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-white/10"
                  onClick={() => { const img = selectedImage(); if (img) setImageDialog({ mode: 'details', pos: img.pos, initial: img }); }}>Alt text & description</button>
                <ToolButton dark label="Replace image" onClick={() => { const img = selectedImage(); if (img) setImageDialog({ mode: 'replace', pos: img.pos, initial: img }); }}><Replace className="h-4 w-4" /></ToolButton>
                <ToolButton dark label="Remove image" onClick={() => editor.chain().focus().deleteSelection().run()}><Trash2 className="h-4 w-4" /></ToolButton>
              </BubbleMenu>
              <BubbleMenu editor={editor} pluginKey="docTableMenu" className={bubble} options={{ placement: 'top-start' }}
                getReferencedVirtualElement={() => tableElement(editor)}
                shouldShow={({ editor: e, from, to, state }) => e.isActive('table') && (from === to || state.selection instanceof CellSelection)}>
                <TableMenu editor={editor} />
              </BubbleMenu>
            </>
          )}
          {/* The page */}
          <div className="px-0 py-0 sm:px-3 sm:py-6 md:px-8 md:py-10">
            <div data-orientation={form.orientation}
              className={`mx-auto w-full rounded-sm bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.06)] transition-[max-width] duration-200 ${form.orientation === 'landscape' ? 'max-w-[1120px]' : 'max-w-[860px]'}`}>
              {mode.kind === 'loading' && <p className="flex items-center gap-2 px-5 py-10 text-[14px] text-[#8a8a8a] sm:px-10 md:px-16"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</p>}
              <EditorContent editor={editor} />
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-[#e5e5e5] px-5 py-2.5 text-[12px] text-[#8a8a8a] dark:border-white/10">
            <button type="button" onClick={() => setWordCount(true)} className="hover:text-[#1a1a1a] hover:underline dark:hover:text-white">{words} words</button>
            <span>{uploads > 0 ? `Uploading ${uploads} image${uploads === 1 ? '' : 's'}…` : editing ? 'Saves automatically · Ctrl+/ for shortcuts' : ''}</span>
          </div>
        </div>

        {/* Details */}
        {panelOpen && docData && me && can && (
          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            {reading ? <DocFacts doc={docData} form={form} /> : (<>
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
                <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Project <span className="font-normal text-[#a3a3a3]">(optional)</span></span>
                <ProjectPicker className={panelField} value={form.project} disabled={!editing} onChange={project => setField('project', project)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Description <span className="font-normal text-[#a3a3a3]">(shown in the list)</span></span>
                <textarea className={`${panelField} min-h-[70px]`} value={form.description} maxLength={300} disabled={!editing} onChange={e => setField('description', e.target.value)} />
              </label>
            </section>

            <section className="space-y-4 rounded-xl border border-[#e5e5e5] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
              <h2 className="text-[14px] font-semibold text-[#292929] dark:text-white">Sharing</h2>
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Who can see it</span>
                <select className={panelField} value={form.share} disabled={!editing || !can.canShare} onChange={e => {
                  const share = e.target.value as DocShare;
                  setField('share', share);
                  // Choosing departments starts from the team it was kept under, if any.
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
            </>)}

            <section className="space-y-2 rounded-xl border border-[#e5e5e5] bg-white p-5 text-[13px] text-[#525252] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-300">
              <p><span className="text-[#8a8a8a]">Owner:</span> {docData.owner.name || docData.owner.email}{docData.owner.uid === me.uid ? ' (you)' : ''}</p>
              <p><span className="text-[#8a8a8a]">Created:</span> {timeAgo(docData.createdAt)}</p>
              {docData.updatedAt && <p><span className="text-[#8a8a8a]">Last edited:</span> {timeAgo(docData.updatedAt)}{docData.updatedBy ? ` by ${docData.updatedBy}` : ''}</p>}
              {docData.originalFile && (
                <p><span className="text-[#8a8a8a]">Uploaded as:</span>{' '}
                  <a href={docData.originalFile.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[#806013] underline-offset-2 hover:underline dark:text-[#f5bd02]">
                    {docData.originalFile.name} <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </p>
              )}
              {editor && !isFile && <SaveTemplateButton me={me} kind="doc" title={form.title || docData.title} category={form.category} body={() => editor.getHTML()} />}
              {can.canDelete && (
                <button type="button" onClick={() => void remove()} className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete document
                </button>
              )}
            </section>
          </aside>
        )}
      </div>

      {linkDialog && (
        <LinkDialog initial={{ href: linkDialog.href, newTab: linkDialog.newTab }} selectedText={linkDialog.selectedText} editing={linkDialog.editing}
          siteLinks={[]} allowSite={false} onApply={applyLink} onRemove={removeLink} onClose={() => { setLinkDialog(null); editor?.commands.focus(); }} />
      )}
      {imageDialog && (
        <ImageDialog mode={imageDialog.mode} initial={imageDialog.initial} upload={upload} onInsert={placeImage} onClose={() => { setImageDialog(null); editor?.commands.focus(); }} />
      )}
      {find && editor && <FindReplace editor={editor} showReplace={find.replace && editing} onClose={() => { setFind(null); editor.commands.focus(); }} />}
      {specialChars && editor && <SpecialCharsDialog editor={editor} onClose={() => { setSpecialChars(false); editor.commands.focus(); }} />}
      {wordCount && editor && <WordCountDialog editor={editor} onClose={() => setWordCount(false)} />}
      {shortcuts && (
        <AeModal title="Keyboard shortcuts" onClose={() => setShortcuts(false)}>
          <dl className="divide-y divide-[#f0eee8] text-[14px]">
            {SHORTCUTS.map(([keys, what]) => (
              <div key={keys} className="flex items-center justify-between gap-4 py-2">
                <dt><kbd className="rounded border border-[#e5e2d9] bg-[#fbfaf6] px-1.5 py-0.5 font-mono text-[12px] text-[#1a1a1a]">{keys}</kbd></dt>
                <dd className="text-right text-[#4a4a4a]">{what}</dd>
              </div>
            ))}
          </dl>
        </AeModal>
      )}
    </div>
  );
}

/** The document's details as plain text, for people reading it (no editing controls). */
function DocFacts({ doc: d, form }: { doc: WorkDoc; form: Form }) {
  const shareText = form.share === 'all' ? 'Everyone in the company'
    : form.share === 'private' ? 'Only its owner'
      : form.share === 'departments' ? (form.sharedDepartments.map(x => x.name).join(', ') || 'No departments yet')
        : d.aeDepartmentName ? `The ${d.aeDepartmentName} team` : `The ${d.department.replace(/\b\w/g, c => c.toUpperCase())} department`;
  const row = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-[#8a8a8a]">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-[#292929] dark:text-gray-100">{value}</dd>
    </div>
  );
  return (
    <section className="rounded-xl border border-[#e5e5e5] bg-white p-5 dark:border-white/10 dark:bg-[#1e1e1e]">
      <dl className="space-y-3">
        {row('Category', form.category)}
        {form.project && row('Project', form.project.name)}
        {form.description && row('Description', form.description)}
        {row('Shared with', shareText)}
        {row('Page', form.orientation === 'landscape' ? 'Landscape' : 'Portrait')}
        {form.share !== 'private' && row('Editing', form.othersCanEdit ? 'Everyone it’s shared with can edit' : 'Only the owner edits')}
      </dl>
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">{children}</div>;
}

/** Bold, italic, underline, highlight, link and clear formatting on selected text. */
function TextBubble({ editor, bubble, onLink }: { editor: Editor; bubble: string; onLink: () => void }) {
  return (
    <BubbleMenu editor={editor} pluginKey="docTextMenu" className={bubble}
      shouldShow={({ editor: e, from, to, state }) => from !== to && !(state.selection instanceof CellSelection) && !e.isActive('image') && !e.isActive('codeBlock')}>
      <ToolButton dark label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
      <ToolButton dark label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
      <ToolButton dark label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="h-4 w-4" /></ToolButton>
      <ToolButton dark label="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#FBEEC9' }).run()}><Highlighter className="h-4 w-4" /></ToolButton>
      <Divider dark />
      <ToolButton dark label="Link" active={editor.isActive('link')} onClick={onLink}><Link2 className="h-4 w-4" /></ToolButton>
      <ToolButton dark label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().run()}><RemoveFormatting className="h-4 w-4" /></ToolButton>
    </BubbleMenu>
  );
}
