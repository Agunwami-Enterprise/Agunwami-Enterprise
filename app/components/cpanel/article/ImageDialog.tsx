'use client';

/**
 * Insert (or replace) an image in the article: drop or choose a file, or use
 * an image address, with a preview; its file name, alt text (for screen
 * readers and search) and description (a caption shown under it). The editor
 * inserts it where the cursor was, without moving the page.
 */

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2, Upload } from 'lucide-react';
import AeModal from '@/app/components/common/AeModal';
import { cx, uploadImage } from '../ui';
import { normalizeWebUrl } from './LinkDialog';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

export interface ArticleImage { src: string; alt: string; caption: string; showCaption: boolean }

/** "Team Retreat_2026.JPG" → "team-retreat-2026": the file name as stored. */
const fileSlug = (name: string) => name.replace(/\.[a-z0-9]{2,5}$/i, '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export default function ImageDialog({ mode, initial, onInsert, onClose, upload = uploadImage }: {
  /** insert: a new image; replace: swap the selected image; details: edit its alt text and description. */
  mode: 'insert' | 'replace' | 'details';
  initial?: { alt: string; caption: string; showCaption: boolean };
  onInsert: (image: ArticleImage) => void;
  onClose: () => void;
  /** Stores the chosen file and returns its address (default: the website's media library). */
  upload?: (file: File, name: string) => Promise<string>;
}) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState(initial?.alt ?? '');
  const [caption, setCaption] = useState(initial?.caption ?? '');
  const [showCaption, setShowCaption] = useState(initial?.showCaption ?? true);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // A local preview of the chosen file.
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const show = setTimeout(() => setPreview(objectUrl), 0);
    return () => { clearTimeout(show); URL.revokeObjectURL(objectUrl); };
  }, [file]);

  function choose(next: File | undefined | null) {
    if (!next) return;
    if (!ACCEPT.split(',').includes(next.type)) { setError('Use a PNG, JPG, WebP or GIF image.'); return; }
    if (next.size > 8 * 1024 * 1024) { setError('Images can be up to 8 MB.'); return; }
    setError('');
    setFile(next);
    setFileName(fileSlug(next.name));
    // A first guess at the alt text from the file name, if none yet.
    setAlt(current => current || next.name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ').trim());
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const details = { alt: alt.trim(), caption: caption.trim(), showCaption };
    if (mode === 'details') { onInsert({ src: '', ...details }); return; }
    setError('');
    if (tab === 'url') {
      const checked = normalizeWebUrl(url);
      if ('error' in checked || checked.href.startsWith('/') || checked.href.startsWith('#')) { setError('Enter the full address of an image (https://…).'); return; }
      onInsert({ src: checked.href, ...details });
      return;
    }
    if (!file) { setError('Choose an image first.'); return; }
    setBusy(true);
    try {
      onInsert({ src: await upload(file, fileSlug(fileName) || fileSlug(file.name)), ...details });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The upload failed. Please try again.');
      setBusy(false);
    }
  }

  const input = 'w-full rounded-lg border border-[#E5E2D9] bg-white px-3 py-2 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#8C8679] focus:border-[#C89B3C]';
  const canSubmit = mode === 'details' || (tab === 'upload' ? !!file : !!url.trim());

  return (
    <AeModal title={mode === 'details' ? 'Image details' : mode === 'replace' ? 'Replace image' : 'Insert an image'} onClose={onClose} dismissible={!busy}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-[#E5E2D9] px-4 py-2 text-[13px] font-medium text-[#4A4A4A] hover:bg-[#F3F1EA] disabled:opacity-50">Cancel</button>
          <button type="submit" form="image-form" disabled={!canSubmit || busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1F1F1F] px-4 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? 'Uploading…' : mode === 'details' ? 'Save' : mode === 'replace' ? 'Replace' : 'Insert image'}
          </button>
        </>
      )}>
      <form id="image-form" onSubmit={submit} className="space-y-4">
        {mode !== 'details' && (
          <>
            <div role="tablist" aria-label="Image source" className="flex gap-1 rounded-lg bg-[#F3F1EA] p-1">
              {([['upload', 'Upload', Upload], ['url', 'From a link', Link2]] as const).map(([id, label, Icon]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(''); }}
                  className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-semibold',
                    tab === id ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]')}>
                  <Icon className="h-4 w-4" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>

            {tab === 'upload' ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }}
                className={cx('flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
                  dragging ? 'border-[#C89B3C] bg-[#C89B3C]/10' : 'border-[#E5E2D9] bg-[#FBFAF6]')}>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="max-h-48 rounded-lg object-contain" />
                ) : <ImagePlus className="h-8 w-8 text-[#B5B0A2]" aria-hidden="true" />}
                <p className="text-[14px] text-[#4A4A4A]">{file ? file.name : 'Drag an image here, or'}</p>
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-[#E5E2D9] bg-white px-3 py-1.5 text-[13px] font-medium text-[#1A1A1A] hover:bg-[#F3F1EA]">
                  {file ? 'Choose another' : 'Choose a file'}
                </button>
                <p className="text-[12px] text-[#9A9A9A]">PNG, JPG, WebP or GIF, up to 8 MB. You can also paste or drop images straight into the article.</p>
                <input ref={fileRef} type="file" hidden accept={ACCEPT} onChange={e => choose(e.target.files?.[0])} />
              </div>
            ) : (
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#4A4A4A]">Image address</span>
                <input className={input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…/photo.jpg" inputMode="url" />
                {url.trim() && 'href' in normalizeWebUrl(url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(normalizeWebUrl(url) as { href: string }).href} alt="" className="mt-3 max-h-48 rounded-lg object-contain" onError={() => setError('That address didn’t load an image.')} onLoad={() => setError('')} />
                )}
              </label>
            )}
          </>
        )}

        {mode !== 'details' && tab === 'upload' && file && (
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#4A4A4A]">File name</span>
            <div className="flex items-center rounded-lg border border-[#E5E2D9] bg-white focus-within:border-[#C89B3C]">
              <input className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#8C8679]"
                value={fileName} maxLength={60} onChange={e => setFileName(e.target.value)} placeholder="e.g. lagos-tech-summit-2026" />
              <span className="shrink-0 pr-3 text-[13px] text-[#8C8679]">.{file.type.split('/')[1]?.replace('jpeg', 'jpg')}</span>
            </div>
            <span className="mt-1 block text-[12px] text-[#6B6B6B]">Saved as {fileSlug(fileName) || 'image'}-… — a descriptive name helps search engines.</span>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#4A4A4A]">Alt text</span>
          <input className={input} value={alt} maxLength={200} onChange={e => setAlt(e.target.value)} placeholder="What the image shows, e.g. Speakers on stage at the summit" autoFocus={mode === 'details'} />
          <span className="mt-1 block text-[12px] text-[#6B6B6B]">Read aloud by screen readers and used by search engines. Not shown on the page.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#4A4A4A]">Description <span className="font-normal text-[#8C8679]">(optional)</span></span>
          <textarea className={`${input} min-h-[64px]`} value={caption} maxLength={300} onChange={e => setCaption(e.target.value)} placeholder="e.g. The 2026 summit drew 400 founders." />
        </label>
        <label className="flex items-start gap-2 text-[13px] text-[#4A4A4A]">
          <input type="checkbox" checked={showCaption} onChange={e => setShowCaption(e.target.checked)} className="mt-0.5 accent-[#C89B3C]" />
          <span>Show the description under the image<span className="block text-[12px] text-[#9A9A9A]">Turn off to keep it saved with the image without showing it to readers.</span></span>
        </label>
        {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      </form>
    </AeModal>
  );
}
