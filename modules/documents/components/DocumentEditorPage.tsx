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
  PanelRightClose, PanelRightOpen, Pencil, Printer, RemoveFormatting, Replace, Trash2, Underline, Unlink,
} from 'lucide-react';
import AeModal, { useConfirm } from '@/app/components/common/AeModal';
import { useAuth } from '@/lib/workstation/auth-context';
import { subscribeUserProfile } from '@/modules/settings/services';
import { articleExtensions } from '@/app/components/cpanel/article/extensions';
import Toolbar, { Divider, ToolButton, applyFontSize, clearFormatting, currentFontSize } from '@/app/components/cpanel/article/Toolbar';
import TableMenu, { tableElement } from '@/app/components/cpanel/article/TableMenu';
import FindReplace from '@/app/components/cpanel/article/FindReplace';
import { SpecialCharsDialog, WordCountDialog } from '@/app/components/cpanel/article/ToolDialogs';
import LinkDialog, { type LinkTarget } from '@/app/components/cpanel/article/LinkDialog';
import ImageDialog, { type ArticleImage } from '@/app/components/cpanel/article/ImageDialog';
import { articleFontsUrl } from '@/backend/modules/site-content/site-content.types';
import HideFromPicker from './HideFromPicker';
import {
  DOC_CATEGORIES, DocConflictError, type HiddenFrom, downloadHtml, downloadWord, heldByOther, lockDoc, permissionsOf, printDoc, releaseDoc,
  removeDoc, saveDoc, shareOf, subscribeDoc, uploadDocImage, type DocLock, type DocShare, type Viewer, type WorkDoc,
} from '../doc-store';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const AUTOSAVE_MS = 1500;
const LOCK_RENEW_MS = 60_000;
const LOCK_RETRY_MS = 20_000;

type Mode = { kind: 'loading' } | { kind: 'checking' } | { kind: 'editing' } | { kind: 'locked'; by: DocLock } | { kind: 'view' };
type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';
type LinkState = { from: number; to: number; href: string; newTab: boolean; selectedText: string; editing: boolean };
type ImageState = { mode: 'insert' | 'replace' | 'details'; pos: number; initial?: { alt: string; caption: string; showCaption: boolean } };
interface Form { title: string; category: string; description: string; share: DocShare; othersCanEdit: boolean; hiddenFrom: HiddenFrom }
type Pending = Partial<Form> & { content?: boolean };

const SHARE_LABELS: Record<DocShare, string> = { private: 'Only me', department: 'My department', all: 'Everyone in the company' };

const formOf = (d: WorkDoc): Form => ({ title: d.title, category: d.category, description: d.description, share: shareOf(d), othersCanEdit: d.othersCanEdit, hiddenFrom: d.hiddenFrom });
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

export default function DocumentEditorPage({ id, basePath, isCeo }: { id: string; basePath: string; isCeo: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [department, setDepartment] = useState<string | null>(null);
  const [docData, setDocData] = useState<WorkDoc | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<Mode>({ kind: 'loading' });
  const [form, setForm] = useState<Form>({ title: '', category: 'General', description: '', share: 'department', othersCanEdit: false, hiddenFrom: { departments: [], people: [] } });
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
    ? { uid: user.uid, name: user.displayName || user.email || 'Team member', email: user.email || '', department, isCeo }
    : null;
  const meRef = useRef(me);
  useEffect(() => { meRef.current = me; });
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const can = docData && me ? permissionsOf(docData, me) : null;
  const editing = mode.kind === 'editing';

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: articleExtensions('Start writing… Type ## and a space for a heading, or paste an image.'),
    content: '',
    editorProps: {
      attributes: () => ({
        class: 'article-content article-editor ProseMirror min-h-[900px] px-8 py-10 md:px-16 md:py-14',
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
      if (modeRef.current.kind === 'editing') markChanged({ content: true });
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
    editor.chain().setMeta('addToHistory', false).setContent(d.content || '<p></p>', { emitUpdate: false }).run();
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
  useEffect(() => {
    if (!ready) return;
    if (!canEdit) {
      const t = setTimeout(() => setMode({ kind: 'view' }), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setMode({ kind: 'checking' }); void acquire(); }, 0);
    return () => clearTimeout(t);
  }, [ready, canEdit, acquire]);

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
    if (editor && !editor.isDestroyed && editor.isEditable !== editing) editor.setEditable(editing);
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
      if (key === 'p' && !e.shiftKey) return run(() => printDoc(form.title, editor.getHTML()));
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
  }, [editor, form.title, openLink]);

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
    return (
      <Centered>
        <Lock className="h-10 w-10 text-[#a3a3a3]" aria-hidden="true" />
        <p className="text-[16px] font-semibold text-[#292929] dark:text-white">You don’t have access to this document</p>
        <p className="max-w-md text-[14px] text-[#656565] dark:text-gray-400">“{docData.title}” is shared only with {shareOf(docData) === 'private' ? 'its owner' : 'another department'}. Ask {docData.owner.name || 'its owner'} to share it.</p>
        <Link href={basePath} className="text-[14px] font-semibold text-[#806013] hover:underline dark:text-[#f5bd02]">Back to Documents</Link>
      </Centered>
    );
  }

  const status = mode.kind === 'loading' || !docData ? 'Loading…'
    : !editing ? (mode.kind === 'checking' ? 'Opening…' : 'Read-only')
      : saveState === 'saving' ? 'Saving…' : saveState === 'unsaved' ? 'Unsaved changes' : saveState === 'error' ? 'Not saved' : 'All changes saved';
  const bubble = 'flex items-center gap-0.5 rounded-lg bg-[#1F1F1F] p-1 shadow-xl';
  const panelField = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none focus:border-[#f5bd02] disabled:bg-[#f7f7f7] disabled:text-[#8a8a8a] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <link rel="stylesheet" href={articleFontsUrl()} precedence="default" />

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#656565] hover:text-[#1a1a1a] dark:text-gray-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Documents
        </Link>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-[#8a8a8a]" aria-live="polite">
          {saveState === 'saving' && editing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {saveState === 'saved' && editing && <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />}
          {saveState === 'error' && <CloudOff className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />}
          {status}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <button type="button" onClick={() => setDownloadOpen(v => !v)} aria-expanded={downloadOpen} disabled={!editor}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] font-medium text-[#292929] hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/5">
              <Download className="h-4 w-4" aria-hidden="true" /> Download <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            {downloadOpen && editor && (
              <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-[#e5e5e5] bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#1e1e1e]" onMouseLeave={() => setDownloadOpen(false)}>
                {[
                  { label: 'Word document (.doc)', run: () => downloadWord(form.title, editor.getHTML()) },
                  { label: 'PDF (print, then Save as PDF)', run: () => printDoc(form.title, editor.getHTML()) },
                  { label: 'Web page (.html)', run: () => downloadHtml(form.title, editor.getHTML()) },
                ].map(item => (
                  <button key={item.label} type="button" onClick={() => { item.run(); setDownloadOpen(false); }}
                    className="block w-full px-3 py-2 text-left text-[13px] text-[#292929] hover:bg-[#f5f5f5] dark:text-gray-200 dark:hover:bg-white/5">{item.label}</button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => editor && printDoc(form.title, editor.getHTML())} title="Print (Ctrl+P)" aria-label="Print"
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
          <div className="px-3 py-6 md:px-8 md:py-10">
            <div className="mx-auto w-full max-w-[860px] rounded-sm bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.06)]">
              <input value={form.title} onChange={e => setField('title', e.target.value)} readOnly={!editing} maxLength={160} aria-label="Document title" placeholder="Untitled document"
                className="w-full bg-transparent px-8 pt-10 font-primary text-[30px] leading-tight text-[#1a1a1a] outline-none placeholder:text-[#b5b0a2] md:px-16 md:pt-14" />
              {mode.kind === 'loading' && <p className="flex items-center gap-2 px-8 py-10 text-[14px] text-[#8a8a8a] md:px-16"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</p>}
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
                  // Hiding from departments only applies to company-wide sharing.
                  if (share !== 'all' && form.hiddenFrom.departments.length) setField('hiddenFrom', { ...form.hiddenFrom, departments: [] });
                }}>
                  {(Object.keys(SHARE_LABELS) as DocShare[]).filter(s => s !== 'department' || me.department || form.share === 'department').map(s => <option key={s} value={s}>{SHARE_LABELS[s]}</option>)}
                </select>
              </label>
              <label className="flex items-start gap-2 text-[13px] text-[#525252] dark:text-gray-300">
                <input type="checkbox" checked={form.othersCanEdit} disabled={!editing || !can.canShare || form.share === 'private'} onChange={e => setField('othersCanEdit', e.target.checked)} className="mt-0.5 accent-[#f5bd02]" />
                <span>Others can edit<span className="block text-[12px] text-[#8a8a8a]">Everyone who can see it can change it, one person at a time.</span></span>
              </label>
              {(can.canShare || form.hiddenFrom.departments.length > 0 || form.hiddenFrom.people.length > 0) && (
                <HideFromPicker value={form.hiddenFrom} share={form.share} ownerUid={docData.owner.uid} disabled={!editing || !can.canShare}
                  onChange={next => setField('hiddenFrom', next)} />
              )}
              {!can.canShare && <p className="text-[12px] text-[#8a8a8a]">Only the owner changes who can see or edit it.</p>}
            </section>

            <section className="space-y-2 rounded-xl border border-[#e5e5e5] bg-white p-5 text-[13px] text-[#525252] dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-300">
              <p><span className="text-[#8a8a8a]">Owner:</span> {docData.owner.name || docData.owner.email}{docData.owner.uid === me.uid ? ' (you)' : ''}</p>
              <p><span className="text-[#8a8a8a]">Created:</span> {timeAgo(docData.createdAt)}</p>
              {docData.updatedAt && <p><span className="text-[#8a8a8a]">Last edited:</span> {timeAgo(docData.updatedAt)}{docData.updatedBy ? ` by ${docData.updatedBy}` : ''}</p>}
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
