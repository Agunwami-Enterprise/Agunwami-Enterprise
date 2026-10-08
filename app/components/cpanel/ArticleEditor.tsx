'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowLeft, Bold, Code, Code2, ExternalLink, Heading2, Heading3, Highlighter,
  ImagePlus, Italic, Link2, List, ListOrdered, Minus, Pilcrow, Quote, Redo2, Strikethrough, Underline, Undo2, Unlink,
} from 'lucide-react';
import {
  Button, Card, ErrorNote, ImageField, Select, TextArea, TextInput, cpanelFetch, cx, uploadImage,
} from './ui';
import { ARTICLE_CATEGORIES, type SiteArticle } from '@/backend/modules/site-content/site-content.types';

type Meta = Omit<SiteArticle, 'id' | 'slug' | 'body' | 'published'>;

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
  };
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

function ToolButton({ label, active, disabled, onClick, children }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled}
      onMouseDown={e => e.preventDefault()} onClick={onClick}
      className={cx('rounded-md p-2 transition-colors disabled:opacity-30',
        active ? 'bg-[#1F1F1F] text-white' : 'text-[#4A4A4A] hover:bg-[#F3F1EA]')}>
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-6 w-px bg-[#E5E2D9]" aria-hidden="true" />;

function Toolbar({ editor, onLink, onImage }: { editor: Editor; onLink: () => void; onImage: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      paragraph: e.isActive('paragraph'),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      highlight: e.isActive('highlight'),
      code: e.isActive('code'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
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

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-[#ECEAE3] bg-white/95 px-3 py-2 backdrop-blur" role="toolbar" aria-label="Formatting">
      <ToolButton label="Paragraph" active={state.paragraph && !state.h2 && !state.h3} onClick={() => chain().setParagraph().run()}><Pilcrow className={s} /></ToolButton>
      <ToolButton label="Heading (section)" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 className={s} /></ToolButton>
      <ToolButton label="Subheading" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 className={s} /></ToolButton>
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
      <ToolButton label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}><Quote className={s} /></ToolButton>
      <ToolButton label="Code block" active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()}><Code2 className={s} /></ToolButton>
      <ToolButton label="Divider line" onClick={() => chain().setHorizontalRule().run()}><Minus className={s} /></ToolButton>
      <Divider />
      <ToolButton label="Add link (Ctrl+K)" active={state.link} onClick={onLink}><Link2 className={s} /></ToolButton>
      {state.link && <ToolButton label="Remove link" onClick={() => chain().extendMarkRange('link').unsetLink().run()}><Unlink className={s} /></ToolButton>}
      <ToolButton label="Insert image" onClick={onImage}><ImagePlus className={s} /></ToolButton>
      <Divider />
      <ToolButton label="Align left" active={state.left} onClick={() => chain().setTextAlign('left').run()}><AlignLeft className={s} /></ToolButton>
      <ToolButton label="Align center" active={state.center} onClick={() => chain().setTextAlign('center').run()}><AlignCenter className={s} /></ToolButton>
      <ToolButton label="Align right" active={state.right} onClick={() => chain().setTextAlign('right').run()}><AlignRight className={s} /></ToolButton>
      <Divider />
      <ToolButton label="Undo (Ctrl+Z)" disabled={!state.canUndo} onClick={() => chain().undo().run()}><Undo2 className={s} /></ToolButton>
      <ToolButton label="Redo (Ctrl+Shift+Z)" disabled={!state.canRedo} onClick={() => chain().redo().run()}><Redo2 className={s} /></ToolButton>
    </div>
  );
}

/** Inline bar under the toolbar for entering a link or image URL. */
function UrlBar({ kind, initial, onSubmit, onCancel, onUpload }: {
  kind: 'link' | 'image'; initial: string; onSubmit: (url: string, alt: string) => void; onCancel: () => void;
  onUpload?: (file: File) => void;
}) {
  const [value, setValue] = useState(initial);
  const [alt, setAlt] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <form className="flex flex-wrap items-center gap-2 border-b border-[#ECEAE3] bg-[#FBFAF6] px-4 py-2.5"
      onSubmit={e => { e.preventDefault(); onSubmit(value.trim(), alt.trim()); }}>
      <input autoFocus value={value} onChange={e => setValue(e.target.value)}
        placeholder={kind === 'link' ? 'Paste a link, e.g. https://…' : 'Image URL, e.g. https://…'}
        className="min-w-[220px] flex-1 rounded-md border border-[#E5E2D9] bg-white px-3 py-1.5 text-[14px] outline-none focus:border-[#C89B3C]"
        onKeyDown={e => e.key === 'Escape' && onCancel()} />
      {kind === 'image' && (
        <input value={alt} onChange={e => setAlt(e.target.value)} placeholder="Describe the image (alt text)"
          className="min-w-[180px] flex-1 rounded-md border border-[#E5E2D9] bg-white px-3 py-1.5 text-[14px] outline-none focus:border-[#C89B3C]" />
      )}
      <Button type="submit" variant="dark" className="py-1.5">{kind === 'link' ? 'Apply' : 'Insert'}</Button>
      {onUpload && (
        <>
          <Button variant="outline" className="py-1.5" onClick={() => fileRef.current?.click()}>Upload…</Button>
          <input ref={fileRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={e => { const file = e.target.files?.[0]; if (file) onUpload(file); }} />
        </>
      )}
      <Button variant="ghost" className="py-1.5" onClick={onCancel}>Cancel</Button>
    </form>
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
  const [urlBar, setUrlBar] = useState<'link' | 'image' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [words, setWords] = useState(0);
  const savingRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing… Use the toolbar or type ## for a section heading.' }),
    ],
    content: article?.body ?? '',
    editorProps: { attributes: { class: 'article-content article-editor ProseMirror px-8 py-7', 'aria-label': 'Article body' } },
    onCreate: ({ editor: e }) => setWords(e.getText().split(/\s+/).filter(Boolean).length),
    onUpdate: ({ editor: e }) => {
      setDirty(true);
      setWords(e.getText().split(/\s+/).filter(Boolean).length);
    },
  });

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

  // Ctrl/Cmd+S saves (keeping the current published state); Ctrl/Cmd+K adds a link.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 's') { e.preventDefault(); void save(published); }
      if (e.key.toLowerCase() === 'k' && editor?.isFocused) { e.preventDefault(); setUrlBar('link'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor, published, save]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function applyLink(url: string) {
    if (!editor) return;
    const chain = editor.chain().focus().extendMarkRange('link');
    if (url) chain.setLink({ href: url }).run(); else chain.unsetLink().run();
    setUrlBar(null);
  }

  function insertImage(src: string, alt: string) {
    if (editor && src) editor.chain().focus().setImage({ src, alt }).run();
    setUrlBar(null);
  }

  async function uploadInto(file: File) {
    setUploading(true);
    setError('');
    try {
      insertImage(await uploadImage(file), '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  const status = dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : published ? 'Published' : article ? 'Draft' : 'New article';

  return (
    <div className="mx-auto max-w-[1180px]">
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

      <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Writing column */}
        <div className="min-w-0 space-y-4">
          <textarea value={meta.title} onChange={e => set('title')(e.target.value)} rows={1} placeholder="Article title"
            aria-label="Title" onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
            className="field-sizing-content w-full resize-none overflow-hidden bg-transparent font-primary text-[34px] leading-tight text-[#1A1A1A] outline-none placeholder:text-[#C9C4B6]" />
          <textarea value={meta.excerpt} onChange={e => set('excerpt')(e.target.value)} rows={2} maxLength={400}
            placeholder="A one or two sentence summary for cards and search results…" aria-label="Excerpt"
            className="field-sizing-content w-full resize-none bg-transparent text-[16px] leading-relaxed text-[#6B6B6B] outline-none placeholder:text-[#C9C4B6]" />
          <Card className="overflow-visible">
            {editor && (
              <>
                <Toolbar editor={editor} onLink={() => setUrlBar('link')} onImage={() => setUrlBar('image')} />
                {urlBar && (
                  <UrlBar key={urlBar} kind={urlBar}
                    initial={urlBar === 'link' ? (editor.getAttributes('link').href as string) ?? '' : ''}
                    onSubmit={(url, alt) => (urlBar === 'link' ? applyLink(url) : insertImage(url, alt))}
                    onCancel={() => setUrlBar(null)}
                    onUpload={urlBar === 'image' ? uploadInto : undefined} />
                )}
                {uploading && <p className="px-4 py-2 text-[13px] text-[#9A9A9A]">Uploading image…</p>}
              </>
            )}
            <EditorContent editor={editor} />
            <div className="flex justify-between border-t border-[#F0EEE8] px-5 py-2.5 text-[12px] text-[#9A9A9A]">
              <span>{words} words · about {Math.max(1, Math.round(words / 220))} min read</span>
              <span>Ctrl+S to save</span>
            </div>
          </Card>
        </div>

        {/* Settings column */}
        <aside className="space-y-5">
          <Card className="space-y-4 p-5">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Details</h2>
            <Select label="Category" value={meta.category} onChange={v => set('category')(v as Meta['category'])} options={ARTICLE_CATEGORIES} />
            <TextInput label="Publish date" type="date" value={meta.date} onChange={set('date')} />
            <TextInput label="Read time" hint="blank = automatic" value={meta.readTime} onChange={set('readTime')} placeholder="7 min read" />
          </Card>
          <Card className="space-y-4 p-5">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Images</h2>
            <ImageField label="Card image" value={meta.image} onChange={set('image')} />
            <ImageField label="Hero image" value={meta.heroImage} onChange={set('heroImage')} />
            <p className="text-[12px] text-[#9A9A9A]">The hero image falls back to the card image.</p>
          </Card>
          <Card className="space-y-4 p-5">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Author</h2>
            <TextInput label="Name" value={meta.author} onChange={set('author')} />
            <TextInput label="Role" value={meta.authorRole} onChange={set('authorRole')} />
            <ImageField label="Photo" value={meta.authorImage} onChange={set('authorImage')} />
          </Card>
          <Card className="space-y-4 p-5">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Pull quote</h2>
            <TextArea label="Highlighted quote" hint="optional" value={meta.pullQuote} onChange={set('pullQuote')} rows={3} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
