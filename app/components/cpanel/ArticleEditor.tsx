'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, ChevronDown, Code, ExternalLink, Highlighter, ImagePlus, Italic,
  Keyboard, Link2, List, ListOrdered, Loader2, Minus, PanelRightClose, PanelRightOpen, Pencil, Redo2, RemoveFormatting,
  Replace, Strikethrough, Trash2, Underline, Undo2, Unlink,
} from 'lucide-react';
import AeModal from '@/app/components/common/AeModal';
import {
  Button, Card, ErrorNote, ImageField, Select, TextArea, TextInput, cpanelFetch, cx, uploadImage, usePersistentToggle,
} from './ui';
import { ARTICLE_CATEGORIES, type SiteArticle } from '@/backend/modules/site-content/site-content.types';
import { FigureImage } from './article/FigureImage';
import LinkDialog, { type LinkTarget, type SiteLink } from './article/LinkDialog';
import ImageDialog, { type ArticleImage } from './article/ImageDialog';
import AuthorPicker, { photoOf } from './article/AuthorPicker';
import type { AuthorOption } from '@/app/api/cpanel/people/route';
import { useAuth } from '@/lib/workstation/auth-context';

type Meta = Omit<SiteArticle, 'id' | 'slug' | 'body' | 'published'> & { showToc: boolean };

function initialMeta(article?: SiteArticle): Meta {
  return {
    title: article?.title ?? '',
    category: article?.category ?? 'Insights',
    excerpt: article?.excerpt ?? '',
    date: article?.date ?? new Date().toISOString().slice(0, 10),
    readTime: article?.readTime ?? '',
    author: article?.author ?? '',
    authorRole: article?.authorRole ?? '',
    authorImage: article?.authorImage ?? '',
    image: article?.image ?? '',
    heroImage: article?.heroImage && article.heroImage !== article.image ? article.heroImage : '',
    pullQuote: article?.pullQuote ?? '',
    showToc: article?.showToc !== false,
  };
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

type LinkState = { from: number; to: number; href: string; newTab: boolean; selectedText: string; editing: boolean };
type ImageState = { mode: 'insert' | 'replace' | 'details'; pos: number; initial?: { alt: string; caption: string } };
interface Heading { level: 2 | 3; text: string; pos: number }

// ── Toolbar ─────────────────────────────────────────────────────────────────

function ToolButton({ label, active, disabled, onClick, children, dark }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; dark?: boolean;
}) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled}
      onMouseDown={e => e.preventDefault()} onClick={onClick}
      className={cx('rounded-md p-2 transition-colors disabled:opacity-30',
        dark
          ? (active ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white')
          : (active ? 'bg-[#1F1F1F] text-white' : 'text-[#4A4A4A] hover:bg-[#F3F1EA]'))}>
      {children}
    </button>
  );
}

const Divider = ({ dark }: { dark?: boolean }) => <span className={cx('mx-1 h-6 w-px', dark ? 'bg-white/15' : 'bg-[#E5E2D9]')} aria-hidden="true" />;

const BLOCKS = [
  { id: 'p', label: 'Paragraph' },
  { id: 'h2', label: 'Section heading' },
  { id: 'h3', label: 'Subheading' },
  { id: 'quote', label: 'Quote' },
  { id: 'code', label: 'Code block' },
] as const;

function Toolbar({ editor, onLink, onImage, onShortcuts }: { editor: Editor; onLink: () => void; onImage: () => void; onShortcuts: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3'
        : e.isActive('blockquote') ? 'quote' : e.isActive('codeBlock') ? 'code' : 'p',
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      highlight: e.isActive('highlight'),
      code: e.isActive('code'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      link: e.isActive('link'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();
  const s = 'h-4 w-4';

  function setBlock(id: string) {
    const c = chain();
    if (id === 'h2') c.setHeading({ level: 2 }).run();
    else if (id === 'h3') c.setHeading({ level: 3 }).run();
    else if (id === 'quote') c.setParagraph().toggleBlockquote().run();
    else if (id === 'code') c.setCodeBlock().run();
    else c.clearNodes().setParagraph().run();
  }

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-[#ECEAE3] bg-white/95 px-3 py-2 backdrop-blur" role="toolbar" aria-label="Formatting">
      <label className="relative mr-1">
        <span className="sr-only">Text style</span>
        <select value={state.block} onChange={e => setBlock(e.target.value)}
          className="appearance-none rounded-md border border-[#E5E2D9] bg-white py-1.5 pl-3 pr-8 text-[13px] font-medium text-[#1A1A1A] outline-none hover:bg-[#FBFAF6] focus:border-[#C89B3C]">
          {BLOCKS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" aria-hidden="true" />
      </label>
      <Divider />
      <ToolButton label="Bold (Ctrl+B)" active={state.bold} onClick={() => chain().toggleBold().run()}><Bold className={s} /></ToolButton>
      <ToolButton label="Italic (Ctrl+I)" active={state.italic} onClick={() => chain().toggleItalic().run()}><Italic className={s} /></ToolButton>
      <ToolButton label="Underline (Ctrl+U)" active={state.underline} onClick={() => chain().toggleUnderline().run()}><Underline className={s} /></ToolButton>
      <ToolButton label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className={s} /></ToolButton>
      <ToolButton label="Highlight" active={state.highlight} onClick={() => chain().toggleHighlight().run()}><Highlighter className={s} /></ToolButton>
      <ToolButton label="Inline code" active={state.code} onClick={() => chain().toggleCode().run()}><Code className={s} /></ToolButton>
      <Divider />
      <ToolButton label="Bulleted list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}><List className={s} /></ToolButton>
      <ToolButton label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className={s} /></ToolButton>
      <ToolButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}><Minus className={s} /></ToolButton>
      <Divider />
      <ToolButton label="Link (Ctrl+K)" active={state.link} onClick={onLink}><Link2 className={s} /></ToolButton>
      <ToolButton label="Image" onClick={onImage}><ImagePlus className={s} /></ToolButton>
      <Divider />
      <ToolButton label="Align left" active={state.left} onClick={() => chain().setTextAlign('left').run()}><AlignLeft className={s} /></ToolButton>
      <ToolButton label="Align center" active={state.center} onClick={() => chain().setTextAlign('center').run()}><AlignCenter className={s} /></ToolButton>
      <ToolButton label="Align right" active={state.right} onClick={() => chain().setTextAlign('right').run()}><AlignRight className={s} /></ToolButton>
      <ToolButton label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}><RemoveFormatting className={s} /></ToolButton>
      <Divider />
      <ToolButton label="Undo (Ctrl+Z)" disabled={!state.canUndo} onClick={() => chain().undo().run()}><Undo2 className={s} /></ToolButton>
      <ToolButton label="Redo (Ctrl+Shift+Z)" disabled={!state.canRedo} onClick={() => chain().redo().run()}><Redo2 className={s} /></ToolButton>
      <span className="ml-auto" />
      <ToolButton label="Keyboard shortcuts" onClick={onShortcuts}><Keyboard className={s} /></ToolButton>
    </div>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl + B / I / U', 'Bold, italic, underline'],
  ['Ctrl + K', 'Add or edit a link'],
  ['Ctrl + S', 'Save'],
  ['Ctrl + Z / Ctrl + Shift + Z', 'Undo / redo'],
  ['## then space', 'Section heading'],
  ['### then space', 'Subheading'],
  ['- or * then space', 'Bulleted list'],
  ['1. then space', 'Numbered list'],
  ['> then space', 'Quote'],
  ['``` then space', 'Code block'],
  ['---', 'Divider line'],
  ['Paste or drop an image', 'Uploads it where you are'],
];

/** A collapsible group in the details panel. */
function Section({ title, children, defaultOpen = true, extra }: { title: string; children: React.ReactNode; defaultOpen?: boolean; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-0">
      <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1A1A]">{title}{extra}</span>
        <ChevronDown className={cx('h-4 w-4 text-[#6B6B6B] transition-transform', open ? 'rotate-180' : '')} aria-hidden="true" />
      </button>
      {open && <div className="space-y-4 border-t border-[#F0EEE8] px-5 pb-5 pt-4">{children}</div>}
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ArticleEditor({ article }: { article?: SiteArticle }) {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta>(() => initialMeta(article));
  const [published, setPublished] = useState(article?.published ?? false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [linkDialog, setLinkDialog] = useState<LinkState | null>(null);
  const [imageDialog, setImageDialog] = useState<ImageState | null>(null);
  const [shortcuts, setShortcuts] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [lastImagePos, setLastImagePos] = useState<number | null>(null);
  const [words, setWords] = useState(0);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [siteLinks, setSiteLinks] = useState<SiteLink[]>([]);
  const [panelHidden, setPanelHidden] = usePersistentToggle('article-panel-hidden');
  const [people, setPeople] = useState<AuthorOption[] | null>(null);
  const [me, setMe] = useState<AuthorOption | null>(null);
  const { user } = useAuth();
  const savingRef = useRef(false);
  const dropRef = useRef<(files: File[], pos: number) => void>(() => undefined);

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
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Links open in the same tab unless "Open in a new tab" is ticked.
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { target: null, rel: null } },
      }),
      FigureImage,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing… Type ## and a space for a section heading, or paste an image.' }),
    ],
    content: article?.body ?? '',
    editorProps: {
      attributes: { class: 'article-content article-editor ProseMirror px-8 py-7', 'aria-label': 'Article body' },
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
        const photo = user?.photoURL && /^https?:\/\//.test(user.photoURL) ? user.photoURL : await photoOf(data.me.uid);
        if (cancelled || !name) return;
        setMeta(m => (m.author ? m : { ...m, author: name, authorRole: m.authorRole || data.me.role, authorImage: m.authorImage || photo }));
      })
      .catch(() => { if (!cancelled) setPeople([]); });
    return () => { cancelled = true; };
  }, [article, user?.displayName, user?.photoURL]);

  // Pages and articles to link to.
  useEffect(() => {
    let cancelled = false;
    cpanelFetch<SiteArticle[]>('/api/cpanel/articles')
      .then(list => {
        if (cancelled) return;
        setSiteLinks(list.filter(a => a.id !== article?.id).map(a => ({
          label: a.title || 'Untitled article', href: `/insights/${a.slug}`, detail: a.published ? 'Article' : 'Draft article',
        })));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [article?.id]);

  const set = <K extends keyof Meta>(key: K) => (value: Meta[K]) => {
    setMeta(m => ({ ...m, [key]: value }));
    setDirty(true);
  };

  const save = useCallback(async (publish: boolean) => {
    if (!editor || savingRef.current) return;
    savingRef.current = true;
    setSaving(publish ? 'publish' : 'draft');
    setError('');
    try {
      const json = { ...meta, heroImage: meta.heroImage || meta.image, body: editor.getHTML(), published: publish };
      const saved = article
        ? await cpanelFetch<SiteArticle>(`/api/cpanel/articles/${article.id}`, { method: 'PATCH', json })
        : await cpanelFetch<SiteArticle>('/api/cpanel/articles', { method: 'POST', json });
      setPublished(saved.published);
      setMeta(m => ({ ...m, readTime: saved.readTime }));
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
  }, [article, editor, meta, router]);

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

  // Ctrl/Cmd+S saves (keeping the current published state); Ctrl/Cmd+K adds a link.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 's') { e.preventDefault(); void save(published); }
      if (e.key.toLowerCase() === 'k' && editor?.isFocused) { e.preventDefault(); openLink(); }
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

  function selectedImage(): { pos: number; alt: string; caption: string } | null {
    if (!editor || !editor.isActive('image')) return null;
    const attrs = editor.getAttributes('image');
    return { pos: editor.state.selection.from, alt: String(attrs.alt ?? ''), caption: String(attrs.caption ?? '') };
  }

  function placeImage(image: ArticleImage) {
    if (!editor || !imageDialog) return;
    const { mode, pos } = imageDialog;
    if (mode === 'insert') {
      editor.chain().focus().setTextSelection(pos).insertContent({ type: 'image', attrs: { src: image.src, alt: image.alt, caption: image.caption } }).scrollIntoView().run();
    } else {
      const attrs = mode === 'details' ? { alt: image.alt, caption: image.caption } : { src: image.src, alt: image.alt, caption: image.caption };
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

  return (
    <div className={cx('mx-auto', panelHidden ? 'max-w-[900px]' : 'max-w-[1240px]')}>
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
          <Button variant="outline" busy={saving === 'draft'} disabled={!!saving} onClick={() => save(false)}>
            {published ? 'Unpublish' : 'Save draft'}
          </Button>
          <Button variant="gold" busy={saving === 'publish'} disabled={!!saving} onClick={() => save(true)}>
            {published ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>
      <ErrorNote message={error} />

      <div className={cx('mt-2 grid grid-cols-1 gap-6', !panelHidden && 'lg:grid-cols-[minmax(0,1fr)_320px]')}>
        {/* Writing column */}
        <div className="min-w-0 space-y-4">
          <textarea value={meta.title} onChange={e => set('title')(e.target.value)} rows={1} placeholder="Article title"
            aria-label="Title" onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
            className="field-sizing-content w-full resize-none overflow-hidden bg-transparent font-primary text-[34px] leading-tight text-[#1A1A1A] outline-none placeholder:text-[#A8A293]" />
          <textarea value={meta.excerpt} onChange={e => set('excerpt')(e.target.value)} rows={2} maxLength={400}
            placeholder="A one or two sentence summary for cards and search results…" aria-label="Excerpt"
            className="field-sizing-content w-full resize-none bg-transparent text-[16px] leading-relaxed text-[#6B6B6B] outline-none placeholder:text-[#A8A293]" />
          <Card className="overflow-visible">
            {editor && (
              <>
                <Toolbar editor={editor} onLink={openLink} onImage={openImage} onShortcuts={() => setShortcuts(true)} />

                {/* On selected text */}
                <BubbleMenu editor={editor} pluginKey="textMenu" className={bubble}
                  shouldShow={({ editor: e, from, to }) => from !== to && !e.isActive('image') && !e.isActive('codeBlock')}>
                  <ToolButton dark label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="h-4 w-4" /></ToolButton>
                  <Divider dark />
                  <ToolButton dark label="Link" active={editor.isActive('link')} onClick={openLink}><Link2 className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().run()}><RemoveFormatting className="h-4 w-4" /></ToolButton>
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
                    onClick={() => { const img = selectedImage(); if (img) setImageDialog({ mode: 'details', pos: img.pos, initial: { alt: img.alt, caption: img.caption } }); }}>
                    Alt text & description
                  </button>
                  <ToolButton dark label="Replace image" onClick={() => { const img = selectedImage(); if (img) setImageDialog({ mode: 'replace', pos: img.pos, initial: { alt: img.alt, caption: img.caption } }); }}><Replace className="h-4 w-4" /></ToolButton>
                  <ToolButton dark label="Remove image" onClick={() => editor.chain().focus().deleteSelection().run()}><Trash2 className="h-4 w-4" /></ToolButton>
                </BubbleMenu>
              </>
            )}
            <EditorContent editor={editor} />
            <div className="flex justify-between border-t border-[#F0EEE8] px-5 py-2.5 text-[12px] text-[#9A9A9A]">
              <span>{words} words · about {Math.max(1, Math.round(words / 220))} min read</span>
              <span>Ctrl+S to save · Ctrl+K to link</span>
            </div>
          </Card>
        </div>

        {/* Details panel */}
        {!panelHidden && (
          <aside className="space-y-4 lg:sticky lg:top-0 lg:max-h-[calc(100vh-160px)] lg:self-start lg:overflow-y-auto lg:pb-4">
            <Section title="Contents" extra={<span className="rounded-full bg-[#F3F1EA] px-2 text-[12px] font-medium text-[#6B6B6B]">{sections.length}</span>}>
              {headings.length === 0 ? (
                <p className="text-[13px] text-[#6B6B6B]">Add section headings (Text style → Section heading, or type ## and a space) to build the table of contents.</p>
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
                <input type="checkbox" checked={meta.showToc} onChange={e => set('showToc')(e.target.checked)} className="mt-0.5 accent-[#C89B3C]" />
                <span>Show the table of contents on the article<span className="block text-[12px] text-[#9A9A9A]">Readers see the section headings beside it and can jump to each.</span></span>
              </label>
            </Section>
            <Section title="Details">
              <Select label="Category" value={meta.category} onChange={v => set('category')(v as Meta['category'])} options={ARTICLE_CATEGORIES} />
              <TextInput label="Publish date" type="date" value={meta.date} onChange={set('date')} />
              <TextInput label="Read time" hint="blank = automatic" value={meta.readTime} onChange={set('readTime')} placeholder="7 min read" />
            </Section>
            <Section title="Images">
              <ImageField label="Card image" value={meta.image} onChange={set('image')} />
              <ImageField label="Hero image" value={meta.heroImage} onChange={set('heroImage')} />
              <p className="text-[12px] text-[#9A9A9A]">The hero image falls back to the card image.</p>
            </Section>
            <Section title="Author" extra={meta.author ? <span className="max-w-[140px] truncate text-[12px] font-normal text-[#6B6B6B]">{meta.author}</span> : undefined}>
              <AuthorPicker value={{ author: meta.author, authorRole: meta.authorRole, authorImage: meta.authorImage }} people={people} me={me}
                onChange={next => { setMeta(m => ({ ...m, ...next })); setDirty(true); }} />
            </Section>
            <Section title="Pull quote" defaultOpen={false}>
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
                  setImageDialog({ mode: 'details', pos: lastImagePos, initial: { alt: String(node.attrs.alt ?? ''), caption: String(node.attrs.caption ?? '') } });
                }
                setLastImagePos(null);
              }}>Add alt text & description</button>
              <button type="button" aria-label="Dismiss" className="text-white/60 hover:text-white" onClick={() => setLastImagePos(null)}>✕</button>
            </>
          )}
        </div>
      )}

      {linkDialog && (
        <LinkDialog initial={{ href: linkDialog.href, newTab: linkDialog.newTab }} selectedText={linkDialog.selectedText} editing={linkDialog.editing}
          siteLinks={siteLinks} onApply={applyLink} onRemove={removeLink} onClose={() => { setLinkDialog(null); editor?.commands.focus(); }} />
      )}
      {imageDialog && (
        <ImageDialog mode={imageDialog.mode} initial={imageDialog.initial} onInsert={placeImage}
          onClose={() => { setImageDialog(null); editor?.commands.focus(); }} />
      )}
      {shortcuts && (
        <AeModal title="Keyboard shortcuts" size="sm" onClose={() => setShortcuts(false)}>
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
