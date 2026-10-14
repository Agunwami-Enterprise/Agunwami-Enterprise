'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { CellSelection } from '@tiptap/pm/tables';
import {
  ArrowLeft, Bold, ChevronDown, ExternalLink, Eye, Highlighter, Italic, Link2, Loader2, Lock, PanelRightClose, PanelRightOpen,
  Pencil, RemoveFormatting, Replace, Settings2, Share2, Trash2, Underline, Unlink,
} from 'lucide-react';
import AeModal, { useConfirm } from '@/app/components/common/AeModal';
import {
  Button, Card, ErrorNote, ImageField, TagInput, TextArea, TextInput, cpanelFetch, cx, uploadImage, usePersistentToggle,
} from './ui';
import { MAX_TAGS, articleFontsUrl, type ArticleCategoryInfo, type ArticleLock, type ArticlePerson, type SiteArticle } from '@/backend/modules/site-content/site-content.types';
import type { ArticlePermissions } from '@/backend/modules/site-content/article-access';
import ShareDialog from './article/ShareDialog';
import { articleExtensions } from './article/extensions';
import Toolbar, { Divider, ToolButton, applyFontSize, clearFormatting, currentFontSize } from './article/Toolbar';
import FindReplace from './article/FindReplace';
import TableMenu, { tableElement } from './article/TableMenu';
import { SpecialCharsDialog, WordCountDialog } from './article/ToolDialogs';
import SeoSettings, { type SeoValue } from './article/SeoSettings';
import CategoryManager from './article/CategoryManager';
import LinkDialog, { type LinkTarget, type SiteLink } from './article/LinkDialog';
import ImageDialog, { type ArticleImage } from './article/ImageDialog';
import AuthorPicker, { photoOf } from './article/AuthorPicker';
import type { AuthorOption } from '@/app/api/cpanel/people/route';
import { useAuth } from '@/lib/workstation/auth-context';

type Meta = Omit<SiteArticle, 'id' | 'body' | 'published' | 'showToc' | 'tags' | 'owner' | 'collaborators' | 'lock' | 'updatedAt' | 'updatedBy' | keyof SeoValue> & SeoValue & {
  tags: string[];
  showToc: boolean;
  /** The hero image is the feature image (heroImage is then saved as the feature image). */
  sameHero: boolean;
};

function initialMeta(article?: SiteArticle): Meta {
  const sameHero = !article?.heroImage || article.heroImage === article.image;
  return {
    title: article?.title ?? '',
    slug: article?.slug ?? '',
    category: article?.category ?? 'Insights',
    excerpt: article?.excerpt ?? '',
    date: article?.date ?? new Date().toISOString().slice(0, 10),
    readTime: article?.readTime ?? '',
    author: article?.author ?? '',
    authorRole: article?.authorRole ?? '',
    authorImage: article?.authorImage ?? '',
    image: article?.image ?? '',
    heroImage: sameHero ? '' : article?.heroImage ?? '',
    sameHero,
    pullQuote: article?.pullQuote ?? '',
    showToc: article?.showToc !== false,
    seoTitle: article?.seoTitle ?? '',
    seoDescription: article?.seoDescription ?? '',
    seoImage: article?.seoImage ?? '',
    noIndex: article?.noIndex === true,
    tags: article?.tags ?? [],
  };
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

type LinkState = { from: number; to: number; href: string; newTab: boolean; selectedText: string; editing: boolean };
type ImageState = { mode: 'insert' | 'replace' | 'details'; pos: number; initial?: { alt: string; caption: string; showCaption: boolean } };
interface Heading { level: 2 | 3; text: string; pos: number }

const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl + B / I / U', 'Bold, italic, underline'],
  ['Ctrl + Shift + S', 'Strikethrough'],
  ['Ctrl + . / Ctrl + ,', 'Superscript / subscript'],
  ['Ctrl + Shift + . / ,', 'Bigger / smaller text'],
  ['Ctrl + K', 'Add or edit a link'],
  ['Ctrl + Shift + L / E / R / J', 'Align left, center, right, justify'],
  ['Ctrl + ] / Ctrl + [', 'Indent / outdent'],
  ['Ctrl + Shift + 7 / 8 / 9', 'Numbered list, bullets, checklist'],
  ['Ctrl + \\', 'Clear formatting'],
  ['Ctrl + F / Ctrl + H', 'Find / find and replace'],
  ['Ctrl + Shift + C', 'Word count'],
  ['Ctrl + S', 'Save'],
  ['Ctrl + Z / Ctrl + Shift + Z', 'Undo / redo'],
  ['Tab / Shift + Tab', 'Next / previous table cell'],
  ['## then space', 'Heading 1'],
  ['### then space', 'Heading 2'],
  ['- or * then space', 'Bulleted list'],
  ['1. then space', 'Numbered list'],
  ['[ ] then space', 'Checklist'],
  ['> then space', 'Quote'],
  ['``` then space', 'Code block'],
  ['---', 'Divider line'],
  ['Paste or drop an image', 'Uploads it where you are'],
];

/** A collapsible group in the details panel. */
function Section({ title, children, defaultOpen = true, extra, id, locked }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; extra?: React.ReactNode; id?: string;
  /** Read-only: its fields can't be changed. */
  locked?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id}>
      <Card className="p-0">
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left">
          <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-[#1A1A1A]">{title}{extra}</span>
          <ChevronDown className={cx('h-4 w-4 shrink-0 text-[#6B6B6B] transition-transform', open ? 'rotate-180' : '')} aria-hidden="true" />
        </button>
        {open && <fieldset disabled={locked} className="min-w-0 space-y-4 border-t border-[#F0EEE8] px-5 pb-5 pt-4">{children}</fieldset>}
      </Card>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

/** A new article: its creator will own it. */
const CREATOR: ArticlePermissions = {
  access: 'owner', canView: true, canEdit: true, canPublish: true, canShare: false, canTransfer: false, canClaim: false, canDelete: true,
};
const LOCK_RENEW_MS = 60_000;
const LOCK_RETRY_MS = 20_000;

type EditState = { mode: 'checking' } | { mode: 'editing' } | { mode: 'locked'; by: ArticleLock } | { mode: 'view' };

export default function ArticleEditor({ article, permissions = CREATOR, me: actor }: {
  article?: SiteArticle;
  /** What the signed-in person may do with it (a new article: everything). */
  permissions?: ArticlePermissions;
  me: ArticlePerson;
}) {
  const router = useRouter();
  // Viewers read; editors wait for whoever has the article open (see the edit lock).
  const [edit, setEdit] = useState<EditState>(() => (!permissions.canEdit ? { mode: 'view' } : article ? { mode: 'checking' } : { mode: 'editing' }));
  const readOnly = edit.mode !== 'editing';
  const [sharing, setSharing] = useState(false);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState(article?.updatedAt ?? '');
  const [meta, setMeta] = useState<Meta>(() => initialMeta(article));
  const [published, setPublished] = useState(article?.published ?? false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [linkDialog, setLinkDialog] = useState<LinkState | null>(null);
  const [imageDialog, setImageDialog] = useState<ImageState | null>(null);
  const [shortcuts, setShortcuts] = useState(false);
  const [find, setFind] = useState<{ replace: boolean } | null>(null);
  const [specialChars, setSpecialChars] = useState(false);
  const [wordCount, setWordCount] = useState(false);
  const [categories, setCategories] = useState<ArticleCategoryInfo[] | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [spellcheck, setSpellcheck] = useState(true);
  const [uploads, setUploads] = useState(0);
  const [lastImagePos, setLastImagePos] = useState<number | null>(null);
  const [words, setWords] = useState(0);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [siteLinks, setSiteLinks] = useState<SiteLink[]>([]);
  const [panelHidden, setPanelHidden] = usePersistentToggle('article-panel-hidden');
  const [people, setPeople] = useState<AuthorOption[] | null>(null);
  // Photos authors already have on other articles (lowercased name → photo).
  const [authorPhotos, setAuthorPhotos] = useState<Map<string, string>>(() => new Map());
  const authorPhotosRef = useRef(authorPhotos);
  const confirm = useConfirm();
  const [me, setMe] = useState<AuthorOption | null>(null);
  const { user } = useAuth();
  const savingRef = useRef(false);
  const dropRef = useRef<(files: File[], pos: number) => void>(() => undefined);
  // Read by the editor's attributes (zoom and spell check) on each update.
  const viewRef = useRef({ zoom: 100, spellcheck: true });

  const readOutline = useCallback((e: Editor) => {
    setWords(e.getText().split(/\s+/).filter(Boolean).length);
    const list: Heading[] = [];
    e.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading' && (node.attrs.level === 2 || node.attrs.level === 3)) {
        list.push({ level: node.attrs.level, text: node.textContent.trim(), pos });
      }
    });
    setHeadings(list);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    editable: edit.mode === 'editing',
    extensions: articleExtensions('Start writing… Type ## and a space for a heading, or paste an image.'),
    content: article?.body ?? '',
    editorProps: {
      attributes: () => ({
        class: 'article-content article-editor ProseMirror px-6 py-7 md:px-12',
        'aria-label': 'Article body',
        spellcheck: String(viewRef.current.spellcheck),
        style: viewRef.current.zoom === 100 ? '' : `zoom: ${viewRef.current.zoom / 100}`,
      }),
      handleDrop: (view, event, _slice, moved) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter(f => IMAGE_TYPES.includes(f.type));
        if (moved || files.length === 0) return false;
        event.preventDefault();
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
        dropRef.current(files, at?.pos ?? view.state.selection.from);
        return true;
      },
      handlePaste: (view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter(f => IMAGE_TYPES.includes(f.type));
        if (files.length === 0) return false;
        event.preventDefault();
        dropRef.current(files, view.state.selection.from);
        return true;
      },
    },
    onCreate: ({ editor: e }) => readOutline(e),
    onUpdate: ({ editor: e }) => { setDirty(true); readOutline(e); },
  });

  // People to credit as author; a new article starts with whoever is signed in.
  useEffect(() => {
    let cancelled = false;
    cpanelFetch<{ me: AuthorOption; people: AuthorOption[] }>('/api/cpanel/people')
      .then(async data => {
        if (cancelled) return;
        setPeople(data.people);
        setMe(data.me);
        if (article) return;
        const name = data.me.name || user?.displayName || '';
        const photo = (user?.photoURL && /^https?:\/\//.test(user.photoURL) ? user.photoURL : await photoOf(data.me.uid))
          || authorPhotosRef.current.get(name.trim().toLowerCase()) || '';
        if (cancelled || !name) return;
        setMeta(m => (m.author ? m : { ...m, author: name, authorRole: m.authorRole || data.me.role, authorImage: m.authorImage || photo }));
      })
      .catch(() => { if (!cancelled) setPeople([]); });
    return () => { cancelled = true; };
  }, [article, user?.displayName, user?.photoURL]);

  // Categories to choose from.
  useEffect(() => {
    let cancelled = false;
    cpanelFetch<ArticleCategoryInfo[]>('/api/cpanel/article-categories')
      .then(list => { if (!cancelled) setCategories(list); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  // Zoom and spell check live in the editor's attributes; an empty update re-reads them.
  useEffect(() => {
    viewRef.current = { zoom, spellcheck };
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false));
  }, [editor, zoom, spellcheck]);

  // Pages and articles to link to.
  useEffect(() => {
    let cancelled = false;
    cpanelFetch<SiteArticle[]>('/api/cpanel/articles')
      .then(list => {
        if (cancelled) return;
        setSiteLinks(list.filter(a => a.id !== article?.id).map(a => ({
          label: a.title || 'Untitled article', href: `/insights/${a.slug}`, detail: a.published ? 'Article' : 'Draft article',
        })));
        const photos = new Map<string, string>();
        for (const a of list) if (a.author && a.authorImage) photos.set(a.author.trim().toLowerCase(), a.authorImage);
        setAuthorPhotos(photos);
        authorPhotosRef.current = photos;
        // An author without a photo here gets the one they have on another article.
        setMeta(m => {
          const photo = m.author && !m.authorImage ? photos.get(m.author.trim().toLowerCase()) : undefined;
          return photo ? { ...m, authorImage: photo } : m;
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [article?.id]);

  const set = <K extends keyof Meta>(key: K) => (value: Meta[K]) => {
    setMeta(m => ({ ...m, [key]: value }));
    setDirty(true);
  };

  const save = useCallback(async (publish: boolean) => {
    if (!editor || savingRef.current || edit.mode !== 'editing') return;
    savingRef.current = true;
    setSaving(publish ? 'publish' : 'draft');
    setError('');
    try {
      const { sameHero, ...fields } = meta;
      const json = { ...fields, heroImage: sameHero ? meta.image : meta.heroImage || meta.image, body: editor.getHTML(), published: publish, baseUpdatedAt };
      const saved = article
        ? await cpanelFetch<SiteArticle>(`/api/cpanel/articles/${article.id}`, { method: 'PATCH', json })
        : await cpanelFetch<SiteArticle>('/api/cpanel/articles', { method: 'POST', json });
      setPublished(saved.published);
      setBaseUpdatedAt(saved.updatedAt ?? '');
      setMeta(m => ({ ...m, readTime: saved.readTime, slug: saved.slug }));
      setDirty(false);
      setSavedAt(new Date());
      if (!article) router.replace(`/cpanel/insights/${saved.id}`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the article.');
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }, [article, editor, meta, router, edit.mode, baseUpdatedAt]);

  // ── Edit lock: one person edits at a time ──

  const lockRequest = useCallback((body: { action: 'acquire' | 'release'; force?: boolean }) =>
    cpanelFetch<{ locked: boolean; lock: ArticleLock | null }>(`/api/cpanel/articles/${article?.id}/lock`, { method: 'POST', json: body }), [article?.id]);

  const acquire = useCallback(async (force = false) => {
    try {
      const result = await lockRequest({ action: 'acquire', force });
      setEdit(result.locked ? { mode: 'editing' } : result.lock ? { mode: 'locked', by: result.lock } : { mode: 'view' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the article for editing.');
      setEdit({ mode: 'view' });
    }
  }, [lockRequest]);

  // Open for editing (or wait for whoever has it), keep the lock while editing, and let go on leaving.
  const articleId = article?.id;
  const canEdit = permissions.canEdit;
  useEffect(() => {
    if (!articleId || !canEdit) return;
    const first = setTimeout(() => void acquire(), 0);
    const release = () => {
      const blob = new Blob([JSON.stringify({ action: 'release' })], { type: 'application/json' });
      navigator.sendBeacon?.(`/api/cpanel/articles/${articleId}/lock`, blob);
    };
    window.addEventListener('pagehide', release);
    return () => {
      clearTimeout(first);
      window.removeEventListener('pagehide', release);
      void lockRequest({ action: 'release' }).catch(() => undefined);
    };
  }, [articleId, canEdit, acquire, lockRequest]);

  useEffect(() => {
    if (edit.mode !== 'editing' && edit.mode !== 'locked') return;
    if (!articleId) return;
    // Renew our lock; or, while someone else has it, try again now and then.
    const timer = setInterval(() => void acquire(), edit.mode === 'editing' ? LOCK_RENEW_MS : LOCK_RETRY_MS);
    return () => clearInterval(timer);
  }, [articleId, edit.mode, acquire]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isEditable === readOnly) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  async function takeOver() {
    if (edit.mode !== 'locked') return;
    const ok = await confirm({
      title: `Take over from ${edit.by.name || edit.by.email}?`,
      message: 'They’ll switch to read-only and any changes they haven’t saved won’t be saved. Let them know first if you can.',
      confirmLabel: 'Take over editing',
    });
    if (ok) await acquire(true);
  }

  /** Publishing without an author photo asks first, offering to add one. */
  async function publish() {
    if (meta.author.trim() && !meta.authorImage) {
      const anyway = await confirm({
        title: 'Add the author’s photo?',
        message: `There’s no photo for ${meta.author.trim()}. It shows beside their name on the article. You can add one now or publish without it.`,
        confirmLabel: published ? 'Update without a photo' : 'Publish without a photo',
        cancelLabel: 'Add a photo',
      });
      if (!anyway) {
        setPanelHidden(false);
        setTimeout(() => {
          const section = document.getElementById('article-author');
          section?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          section?.querySelector<HTMLInputElement>('[data-author-photo] input')?.focus({ preventScroll: true });
        }, 50);
        return;
      }
    }
    void save(true);
  }

  // ── Links ──

  const openLink = useCallback(() => {
    if (!editor) return;
    const inLink = editor.isActive('link');
    if (inLink) editor.commands.extendMarkRange('link');
    const { from, to } = editor.state.selection;
    const attrs = editor.getAttributes('link');
    setLinkDialog({
      from, to,
      href: inLink ? String(attrs.href ?? '') : '',
      newTab: attrs.target === '_blank',
      selectedText: editor.state.doc.textBetween(from, to, ' '),
      editing: inLink,
    });
  }, [editor]);

  function applyLink(link: LinkTarget) {
    if (!editor || !linkDialog) return;
    const { from, to, selectedText } = linkDialog;
    const attrs = { href: link.href, target: link.newTab ? '_blank' : null };
    const chain = editor.chain().focus();
    if (link.text && link.text !== selectedText) {
      chain.insertContentAt({ from, to }, { type: 'text', text: link.text, marks: [{ type: 'link', attrs }] })
        .setTextSelection(from + link.text.length);
    } else {
      chain.setTextSelection({ from, to }).setLink(attrs).setTextSelection(to);
    }
    // Typing after the link shouldn't continue it.
    chain.unsetMark('link').scrollIntoView().run();
    setLinkDialog(null);
  }

  function removeLink() {
    if (!editor || !linkDialog) return;
    editor.chain().focus().setTextSelection({ from: linkDialog.from, to: linkDialog.to }).unsetLink().setTextSelection(linkDialog.to).scrollIntoView().run();
    setLinkDialog(null);
  }

  // Shortcuts beyond the editor's own: Ctrl/Cmd+S saves (keeping the published state) anywhere;
  // in the article, Ctrl+K links, Ctrl+F / Ctrl+H find, Ctrl+Shift+. / , resize text, Ctrl+\ clears
  // formatting, Ctrl+Shift+C counts words and Ctrl+/ lists the shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') { e.preventDefault(); void save(published); return; }
      if (!editor?.isFocused) return;
      const run = (action: () => void) => { e.preventDefault(); action(); };
      if (key === 'k') run(openLink);
      else if (key === 'f' && !e.shiftKey) run(() => setFind({ replace: false }));
      else if (key === 'h') run(() => setFind({ replace: true }));
      else if (e.shiftKey && (key === '>' || key === '.')) run(() => applyFontSize(editor, currentFontSize(editor) + 1));
      else if (e.shiftKey && (key === '<' || key === ',')) run(() => applyFontSize(editor, currentFontSize(editor) - 1));
      else if (key === '\\') run(() => clearFormatting(editor));
      else if (e.shiftKey && key === 'c') run(() => setWordCount(true));
      else if (key === '/') run(() => setShortcuts(true));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, published, save, openLink]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ── Images ──

  function openImage() {
    if (!editor) return;
    setImageDialog({ mode: 'insert', pos: editor.state.selection.from });
  }

  function selectedImage(): { pos: number; alt: string; caption: string; showCaption: boolean } | null {
    if (!editor || !editor.isActive('image')) return null;
    const attrs = editor.getAttributes('image');
    return { pos: editor.state.selection.from, alt: String(attrs.alt ?? ''), caption: String(attrs.caption ?? ''), showCaption: attrs.showCaption !== false };
  }

  function placeImage(image: ArticleImage) {
    if (!editor || !imageDialog) return;
    const { mode, pos } = imageDialog;
    if (mode === 'insert') {
      editor.chain().focus().setTextSelection(pos).insertContent({ type: 'image', attrs: { src: image.src, alt: image.alt, caption: image.caption, showCaption: image.showCaption } }).scrollIntoView().run();
    } else {
      const details = { alt: image.alt, caption: image.caption, showCaption: image.showCaption };
      const attrs = mode === 'details' ? details : { src: image.src, ...details };
      editor.chain().focus().setNodeSelection(pos).updateAttributes('image', attrs).scrollIntoView().run();
    }
    setImageDialog(null);
  }

  // Pasted or dropped images upload in place, without moving the page.
  const uploadDropped = useCallback((files: File[], pos: number) => {
    if (!editor) return;
    setError('');
    setUploads(n => n + files.length);
    void (async () => {
      let at = pos;
      for (const file of files) {
        try {
          const src = await uploadImage(file, file.name);
          const alt = file.name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ').trim();
          editor.chain().setTextSelection(Math.min(at, editor.state.doc.content.size)).insertContent({ type: 'image', attrs: { src, alt, caption: '' } }).run();
          at = editor.state.selection.to;
          setLastImagePos(Math.max(0, at - 1));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An image could not be uploaded.');
        } finally {
          setUploads(n => n - 1);
        }
      }
    })();
  }, [editor]);
  useEffect(() => { dropRef.current = uploadDropped; }, [uploadDropped]);

  function jumpTo(pos: number) {
    editor?.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
  }

  const status = dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : published ? 'Published' : article ? 'Draft' : 'New article';
  const sections = headings.filter(h => h.level === 2);
  const bubble = 'flex items-center gap-0.5 rounded-lg bg-[#1F1F1F] p-1 shadow-xl';
  const categoryNames = categories?.map(c => c.name) ?? [meta.category];

  return (
    <div className="w-full">
      {/* The editor's web fonts (font files download only when used) */}
      <link rel="stylesheet" href={articleFontsUrl()} precedence="default" />
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/cpanel/insights" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6B6B6B] hover:text-[#1A1A1A]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All articles
        </Link>
        <span className={cx('ml-2 rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
          published ? 'bg-green-50 text-green-700' : 'bg-[#F3F1EA] text-[#6B6B6B]')}>
          {published ? 'Published' : 'Draft'}
        </span>
        <span className="text-[13px] text-[#9A9A9A]" aria-live="polite">{status}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setPanelHidden(v => !v)} aria-expanded={!panelHidden} title={panelHidden ? 'Show the details panel' : 'Hide the details panel'}>
            {panelHidden ? <PanelRightOpen className="h-4 w-4" aria-hidden="true" /> : <PanelRightClose className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{panelHidden ? 'Show details' : 'Hide details'}</span>
          </Button>
          {article && published && (
            <Button variant="ghost" onClick={() => window.open(`/insights/${article.slug}`, '_blank', 'noopener')}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> View live
            </Button>
          )}
          {article && (
            <Button variant="outline" onClick={() => setSharing(true)} title={article.owner ? `Owned by ${article.owner.name || article.owner.email}` : 'This article has no owner yet'}>
              <Share2 className="h-4 w-4" aria-hidden="true" /> Share
            </Button>
          )}
          {!readOnly && (permissions.canPublish || !published) && (
            <Button variant="outline" busy={saving === 'draft'} disabled={!!saving} onClick={() => save(false)}>
              {published ? 'Unpublish' : 'Save draft'}
            </Button>
          )}
          {!readOnly && (permissions.canPublish || published) && (
            <Button variant="gold" busy={saving === 'publish'} disabled={!!saving} onClick={() => void publish()}>
              {published ? 'Update' : 'Publish'}
            </Button>
          )}
        </div>
      </div>
      <ErrorNote message={error} />
      {edit.mode === 'view' && (
        <div role="status" className="mb-4 flex items-center gap-3 rounded-xl border border-[#E5E2D9] bg-white px-4 py-3 text-[14px] text-[#4A4A4A]">
          <Eye className="h-5 w-5 shrink-0 text-[#8C8679]" aria-hidden="true" />
          <span>You can view this article. To change it, ask {article?.owner?.name || article?.owner?.email || 'its owner'} for edit access.</span>
        </div>
      )}
      {edit.mode === 'locked' && (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900">
          <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1"><strong className="font-semibold">{edit.by.name || edit.by.email}</strong> is editing this article, so it’s read-only for you. It opens for editing as soon as they’re done.</span>
          {(permissions.canShare || permissions.canClaim) && (
            <button type="button" onClick={() => void takeOver()} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-amber-900 hover:bg-amber-100">Take over</button>
          )}
        </div>
      )}
      {edit.mode === 'checking' && <p className="mb-4 flex items-center gap-2 text-[13px] text-[#6B6B6B]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Opening for editing…</p>}
      {edit.mode === 'editing' && article && !permissions.canPublish && (
        <p className="mb-4 text-[13px] text-[#6B6B6B]">You can edit {published ? 'and update' : 'and save'} this article. Publishing and unpublishing are for its owner and managers.</p>
      )}

      <div className={cx('mt-2 grid grid-cols-1 gap-6', !panelHidden && 'lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px]')}>
        {/* Writing column */}
        <div className="min-w-0 space-y-4">
          <textarea value={meta.title} onChange={e => set('title')(e.target.value)} rows={1} placeholder="Article title" readOnly={readOnly}
            aria-label="Title" onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
            className="field-sizing-content w-full resize-none overflow-hidden bg-transparent font-primary text-[34px] leading-tight text-[#1A1A1A] outline-none placeholder:text-[#A8A293]" />
          <textarea value={meta.excerpt} onChange={e => set('excerpt')(e.target.value)} rows={2} maxLength={400} readOnly={readOnly}
            placeholder="A one or two sentence summary for cards and search results…" aria-label="Excerpt"
            className="field-sizing-content w-full resize-none bg-transparent text-[16px] leading-relaxed text-[#6B6B6B] outline-none placeholder:text-[#A8A293]" />
          <Card className="overflow-visible">
            {editor && !readOnly && (
              <>
                <Toolbar editor={editor} onLink={openLink} onImage={openImage} onShortcuts={() => setShortcuts(true)}
                  onFind={replace => setFind({ replace })} onSpecialChars={() => setSpecialChars(true)} onWordCount={() => setWordCount(true)}
                  zoom={zoom} onZoom={setZoom} spellcheck={spellcheck} onSpellcheck={setSpellcheck}
                  panelHidden={panelHidden} onTogglePanel={() => setPanelHidden(v => !v)} />

                {/* On selected text */}
                <BubbleMenu editor={editor} pluginKey="textMenu" className={bubble}
                  shouldShow={({ editor: e, from, to, state }) => from !== to && !(state.selection instanceof CellSelection) && !e.isActive('image') && !e.isActive('codeBlock')}>
                  <ToolButton dark label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#FBEEC9' }).run()}><Highlighter className="h-4 w-4" /></ToolButton>
                  <Divider dark />
                  <ToolButton dark label="Link" active={editor.isActive('link')} onClick={openLink}><Link2 className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().run()}><RemoveFormatting className="h-4 w-4" /></ToolButton>
                </BubbleMenu>

                {/* In a table: shown above it */}
                <BubbleMenu editor={editor} pluginKey="tableMenu" className={bubble} options={{ placement: 'top-start' }}
                  getReferencedVirtualElement={() => tableElement(editor)}
                  shouldShow={({ editor: e, from, to, state }) => e.isActive('table') && (from === to || state.selection instanceof CellSelection)}>
                  <TableMenu editor={editor} />
                </BubbleMenu>

                {/* In a link */}
                <BubbleMenu editor={editor} pluginKey="linkMenu" className={bubble}
                  shouldShow={({ editor: e, from, to }) => from === to && e.isActive('link')}>
                  <a href={String(editor.getAttributes('link').href ?? '')} target="_blank" rel="noopener noreferrer"
                    className="max-w-[220px] truncate px-2 text-[13px] text-white/90 underline underline-offset-2 hover:text-white">
                    {String(editor.getAttributes('link').href ?? '')}
                  </a>
                  <Divider dark />
                  <ToolButton dark label="Edit link" onClick={openLink}><Pencil className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Remove link" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}><Unlink className="h-4 w-4" /></ToolButton>
                </BubbleMenu>

                {/* On an image */}
                <BubbleMenu editor={editor} pluginKey="imageMenu" className={bubble}
                  shouldShow={({ editor: e }) => e.isActive('image')}>
                  <button type="button" onMouseDown={e => e.preventDefault()} className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-white/10"
                    onClick={() => { const img = selectedImage(); if (img) setImageDialog({ mode: 'details', pos: img.pos, initial: { alt: img.alt, caption: img.caption, showCaption: img.showCaption } }); }}>
                    Alt text & description
                  </button>
                  {String(editor.getAttributes('image').caption ?? '').trim() && (
                    <button type="button" onMouseDown={e => e.preventDefault()} className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-white/85 hover:bg-white/10"
                      onClick={() => editor.chain().focus().updateAttributes('image', { showCaption: editor.getAttributes('image').showCaption === false }).run()}>
                      {editor.getAttributes('image').showCaption === false ? 'Show description' : 'Hide description'}
                    </button>
                  )}
                  <ToolButton dark label="Replace image" onClick={() => { const img = selectedImage(); if (img) setImageDialog({ mode: 'replace', pos: img.pos, initial: { alt: img.alt, caption: img.caption, showCaption: img.showCaption } }); }}><Replace className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Remove image" onClick={() => editor.chain().focus().deleteSelection().run()}><Trash2 className="h-4 w-4" /></ToolButton>
                </BubbleMenu>
              </>
            )}
            <EditorContent editor={editor} />
            <div className="flex justify-between border-t border-[#F0EEE8] px-5 py-2.5 text-[12px] text-[#9A9A9A]">
              <button type="button" onClick={() => setWordCount(true)} className="hover:text-[#1A1A1A] hover:underline">{words} words · about {Math.max(1, Math.round(words / 220))} min read</button>
              <span>Ctrl+S to save · Ctrl+/ for shortcuts</span>
            </div>
          </Card>
        </div>

        {/* Details panel */}
        {!panelHidden && (
          <aside className="space-y-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-160px)] lg:self-start lg:overflow-y-auto lg:pb-4">
            <Section title="Contents" extra={<span className="rounded-full bg-[#F3F1EA] px-2 text-[12px] font-medium text-[#6B6B6B]">{sections.length}</span>}>
              {headings.length === 0 ? (
                <p className="text-[13px] text-[#6B6B6B]">Add headings (Styles → Heading 1 or 2, or type ## and a space) to build the table of contents.</p>
              ) : (
                <nav aria-label="Article outline">
                  <ol className="space-y-1">
                    {headings.map((h, i) => (
                      <li key={`${h.pos}-${i}`}>
                        <button type="button" onClick={() => jumpTo(h.pos)}
                          className={cx('flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-[13px] leading-snug hover:bg-[#F3F1EA]',
                            h.level === 3 ? 'pl-7 text-[#6B6B6B]' : 'font-medium text-[#1A1A1A]')}>
                          {h.level === 2 && <span className="mt-px text-[11px] font-bold text-[#C89B3C]">{String(sections.indexOf(h) + 1).padStart(2, '0')}</span>}
                          <span className="min-w-0">{h.text || <em className="text-[#9A9A9A]">Empty heading</em>}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              <label className="flex items-start gap-2 text-[13px] text-[#4A4A4A]">
                <input type="checkbox" checked={meta.showToc} disabled={readOnly} onChange={e => set('showToc')(e.target.checked)} className="mt-0.5 accent-[#C89B3C]" />
                <span>Show the table of contents on the article<span className="block text-[12px] text-[#9A9A9A]">Readers see the section headings beside it and can jump to each.</span></span>
              </label>
            </Section>
            <Section locked={readOnly} title="Details">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="article-category" className="text-[13px] font-medium text-[#3A3A3A]">Category</label>
                  <button type="button" onClick={() => setManagingCategories(true)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#8A6A1F] hover:underline">
                    <Settings2 className="h-3.5 w-3.5" aria-hidden="true" /> Add or edit
                  </button>
                </div>
                <div className="relative">
                  <select id="article-category" value={meta.category} onChange={e => set('category')(e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[#E5E2D9] bg-white py-2 pl-3 pr-9 text-[14px] text-[#1A1A1A] outline-none focus:border-[#C89B3C]">
                    {!categoryNames.includes(meta.category) && <option value={meta.category}>{meta.category}</option>}
                    {categoryNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" aria-hidden="true" />
                </div>
              </div>
              <TextInput label="Publish date" type="date" value={meta.date} onChange={set('date')} />
              <TextInput label="Read time" hint="blank = automatic" value={meta.readTime} onChange={set('readTime')} placeholder="7 min read" />
              <TagInput label="Tags" hint={`up to ${MAX_TAGS}`} values={meta.tags} placeholder="Type a tag and press Enter"
                onChange={tags => set('tags')(tags.slice(0, MAX_TAGS))} />
            </Section>
            <Section locked={readOnly} title="Images">
              <div>
                <ImageField label="Feature image" value={meta.image} onChange={set('image')} />
                <p className="mt-1 text-[12px] text-[#6B6B6B]">The article’s picture on the Insights page, in related articles and when it’s shared.</p>
              </div>
              <label className="flex items-start gap-2 text-[13px] text-[#4A4A4A]">
                <input type="checkbox" checked={meta.sameHero} onChange={e => set('sameHero')(e.target.checked)} className="mt-0.5 accent-[#C89B3C]" />
                <span>Use the feature image as the hero image<span className="block text-[12px] text-[#9A9A9A]">The hero is the large image at the top of the article.</span></span>
              </label>
              {!meta.sameHero && (
                <div>
                  <ImageField label="Hero image" value={meta.heroImage} onChange={set('heroImage')} />
                  {!meta.heroImage && <p className="mt-1 text-[12px] text-[#6B6B6B]">Until you add one, the feature image is used.</p>}
                </div>
              )}
            </Section>
            <Section locked={readOnly} title="SEO" defaultOpen={false} extra={meta.noIndex ? <span className="rounded-full bg-amber-50 px-2 text-[11px] font-semibold text-amber-700">Hidden</span> : undefined}>
              <SeoSettings
                value={{ seoTitle: meta.seoTitle, seoDescription: meta.seoDescription, seoImage: meta.seoImage, noIndex: meta.noIndex, slug: meta.slug }}
                fallback={{ title: meta.title, excerpt: meta.excerpt, image: meta.image }}
                savedSlug={article?.slug} published={published}
                onChange={next => { setMeta(m => ({ ...m, ...next })); setDirty(true); }} />
            </Section>
            <Section locked={readOnly} title="Author" id="article-author" extra={meta.author ? (
              <>
                <span className="max-w-[140px] truncate text-[12px] font-normal text-[#6B6B6B]">{meta.author}</span>
                {!meta.authorImage && <span className="rounded-full bg-amber-50 px-2 text-[11px] font-semibold text-amber-700">Photo needed</span>}
              </>
            ) : undefined}>
              <AuthorPicker value={{ author: meta.author, authorRole: meta.authorRole, authorImage: meta.authorImage }} people={people} me={me} knownPhotos={authorPhotos}
                onChange={next => { setMeta(m => ({ ...m, ...next })); setDirty(true); }} />
            </Section>
            <Section locked={readOnly} title="Pull quote" defaultOpen={false}>
              <TextArea label="Highlighted quote" hint="optional" value={meta.pullQuote} onChange={set('pullQuote')} rows={3} />
            </Section>
          </aside>
        )}
      </div>

      {/* Upload progress and follow-up, out of the way and without moving the page */}
      {(uploads > 0 || lastImagePos !== null) && (
        <div role="status" className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-xl bg-[#1F1F1F] px-4 py-3 text-[13px] text-white shadow-2xl">
          {uploads > 0 ? (
            <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Uploading {uploads} image{uploads === 1 ? '' : 's'}…</>
          ) : (
            <>
              Image added.
              <button type="button" className="font-semibold text-[#E9C46A] hover:underline" onClick={() => {
                if (!editor || lastImagePos === null) return;
                const node = editor.state.doc.nodeAt(lastImagePos);
                if (node?.type.name === 'image') {
                  editor.chain().setNodeSelection(lastImagePos).scrollIntoView().run();
                  setImageDialog({ mode: 'details', pos: lastImagePos, initial: { alt: String(node.attrs.alt ?? ''), caption: String(node.attrs.caption ?? ''), showCaption: node.attrs.showCaption !== false } });
                }
                setLastImagePos(null);
              }}>Add alt text & description</button>
              <button type="button" aria-label="Dismiss" className="text-white/60 hover:text-white" onClick={() => setLastImagePos(null)}>✕</button>
            </>
          )}
        </div>
      )}

      {sharing && article && (
        <ShareDialog article={article} permissions={permissions} me={actor} people={people}
          onChanged={() => router.refresh()} onClose={() => setSharing(false)} />
      )}
      {linkDialog && (
        <LinkDialog initial={{ href: linkDialog.href, newTab: linkDialog.newTab }} selectedText={linkDialog.selectedText} editing={linkDialog.editing}
          siteLinks={siteLinks} onApply={applyLink} onRemove={removeLink} onClose={() => { setLinkDialog(null); editor?.commands.focus(); }} />
      )}
      {imageDialog && (
        <ImageDialog mode={imageDialog.mode} initial={imageDialog.initial} onInsert={placeImage}
          onClose={() => { setImageDialog(null); editor?.commands.focus(); }} />
      )}
      {find && editor && <FindReplace editor={editor} showReplace={find.replace} onClose={() => { setFind(null); editor.commands.focus(); }} />}
      {specialChars && editor && <SpecialCharsDialog editor={editor} onClose={() => { setSpecialChars(false); editor.commands.focus(); }} />}
      {wordCount && editor && <WordCountDialog editor={editor} onClose={() => { setWordCount(false); editor.commands.focus(); }} />}
      {managingCategories && (
        <CategoryManager categories={categories ?? []} onChange={setCategories} onClose={() => setManagingCategories(false)}
          onPick={name => set('category')(name)} />
      )}
      {shortcuts && (
        <AeModal title="Keyboard shortcuts" onClose={() => setShortcuts(false)}>
          <dl className="divide-y divide-[#F0EEE8] text-[14px]">
            {SHORTCUTS.map(([keys, what]) => (
              <div key={keys} className="flex items-center justify-between gap-4 py-2">
                <dt><kbd className="rounded border border-[#E5E2D9] bg-[#FBFAF6] px-1.5 py-0.5 font-mono text-[12px] text-[#1A1A1A]">{keys}</kbd></dt>
                <dd className="text-right text-[#4A4A4A]">{what}</dd>
              </div>
            ))}
          </dl>
        </AeModal>
      )}
    </div>
  );
}
