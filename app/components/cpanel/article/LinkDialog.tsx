'use client';

/**
 * Add or edit a link in the article editor: a web address (checked and
 * completed, e.g. "example.com" → "https://example.com"), a page or article
 * on this site, or an email address; the text to show; and whether it opens
 * in a new tab.
 */

import { useMemo, useState } from 'react';
import { ExternalLink, FileText, Globe, Mail, Search } from 'lucide-react';
import AeModal from '@/app/components/common/AeModal';
import { cx } from '../ui';

export interface LinkTarget { href: string; text: string; newTab: boolean }
export interface SiteLink { label: string; href: string; detail: string }

type Kind = 'web' | 'site' | 'email';

const SITE_PAGES: SiteLink[] = [
  { label: 'Home', href: '/', detail: 'Page' },
  { label: 'About', href: '/about', detail: 'Page' },
  { label: 'Services', href: '/services', detail: 'Page' },
  { label: 'Projects', href: '/projects', detail: 'Page' },
  { label: 'Ecosystem', href: '/ecosystem', detail: 'Page' },
  { label: 'Insights', href: '/insights', detail: 'Page' },
  { label: 'Expert Insights', href: '/expert-insights', detail: 'Page' },
  { label: 'Partnerships', href: '/partnerships', detail: 'Page' },
  { label: 'Partner with us (apply)', href: '/partnerships/apply', detail: 'Page' },
  { label: 'Contact', href: '/contact', detail: 'Page' },
];

/** Completes and checks a web address; returns an error message instead when it isn't one. */
export function normalizeWebUrl(raw: string): { href: string } | { error: string } {
  const value = raw.trim();
  if (!value) return { error: 'Enter a web address.' };
  if (value.startsWith('/') || value.startsWith('#')) return { href: value };
  if (/^mailto:/i.test(value)) return { href: value };
  const withScheme = /^[a-z][\w+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: 'Only web (http/https) and email links are allowed.' };
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return { error: 'That doesn’t look like a web address.' };
    return { href: url.toString() };
  } catch {
    return { error: 'That doesn’t look like a web address.' };
  }
}

function kindOf(href: string): Kind {
  if (/^mailto:/i.test(href)) return 'email';
  if (href.startsWith('/') || href.startsWith('#')) return 'site';
  return 'web';
}

export default function LinkDialog({ initial, selectedText, editing, siteLinks, onApply, onRemove, onClose, allowSite = true }: {
  initial: { href: string; newTab: boolean };
  /** The selected text, if any; the link goes on it (or on new text if none is selected). */
  selectedText: string;
  editing: boolean;
  siteLinks: SiteLink[];
  onApply: (link: LinkTarget) => void;
  onRemove: () => void;
  onClose: () => void;
  /** Offer pages and articles on the website (the article editor); off for workstation documents. */
  allowSite?: boolean;
}) {
  const startKind = initial.href ? kindOf(initial.href) : 'web';
  const [kind, setKind] = useState<Kind>(startKind);
  const [web, setWeb] = useState(startKind === 'web' ? initial.href : '');
  const [site, setSite] = useState(startKind === 'site' ? initial.href : '');
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState(() => (startKind === 'email' ? decodeURIComponent(initial.href.replace(/^mailto:/i, '').split('?')[0]) : ''));
  const [subject, setSubject] = useState(() => {
    if (startKind !== 'email') return '';
    const query = initial.href.split('?')[1] ?? '';
    return new URLSearchParams(query).get('subject') ?? '';
  });
  const [text, setText] = useState(selectedText);
  const [newTab, setNewTab] = useState(editing ? initial.newTab : startKind === 'web');
  const [touched, setTouched] = useState(false);

  const allSite = useMemo(() => [...SITE_PAGES, ...siteLinks], [siteLinks]);
  const term = search.trim().toLowerCase();
  const siteResults = allSite.filter(l => !term || l.label.toLowerCase().includes(term) || l.href.toLowerCase().includes(term)).slice(0, 40);

  const result: { href: string } | { error: string } = kind === 'web'
    ? normalizeWebUrl(web)
    : kind === 'site'
      ? (site ? { href: site } : { error: 'Choose a page or article.' })
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? { href: `mailto:${email.trim()}${subject.trim() ? `?subject=${encodeURIComponent(subject.trim())}` : ''}` }
        : { error: 'Enter a valid email address.' };
  const needsText = !selectedText;
  const textError = needsText && !text.trim() ? 'Add the text to show.' : '';
  const error = 'error' in result ? result.error : textError;
  const preview = 'href' in result ? result.href : '';

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setTouched(true);
    if (error || !preview) return;
    onApply({ href: preview, text: text.trim() || selectedText, newTab: kind === 'email' ? false : newTab });
  }

  const tab = (id: Kind, label: string, Icon: typeof Globe) => (
    <button type="button" role="tab" aria-selected={kind === id} onClick={() => { setKind(id); setTouched(false); if (id === 'site') setNewTab(false); if (id === 'web' && !editing) setNewTab(true); }}
      className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-semibold transition-colors',
        kind === id ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]')}>
      <Icon className="h-4 w-4" aria-hidden="true" /> {label}
    </button>
  );
  const input = 'w-full rounded-lg border border-[#E5E2D9] bg-white px-3 py-2 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#8C8679] focus:border-[#C89B3C]';

  return (
    <AeModal title={editing ? 'Edit link' : 'Add a link'} onClose={onClose}
      footer={(
        <>
          {editing && <button type="button" onClick={onRemove} className="mr-auto rounded-lg px-3 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50">Remove link</button>}
          <button type="button" onClick={onClose} className="rounded-lg border border-[#E5E2D9] px-4 py-2 text-[13px] font-medium text-[#4A4A4A] hover:bg-[#F3F1EA]">Cancel</button>
          <button type="submit" form="link-form" className="rounded-lg bg-[#1F1F1F] px-4 py-2 text-[13px] font-semibold text-white hover:bg-black">{editing ? 'Update link' : 'Add link'}</button>
        </>
      )}>
      <form id="link-form" onSubmit={submit} className="space-y-4">
        <div role="tablist" aria-label="Link to" className="flex gap-1 rounded-lg bg-[#F3F1EA] p-1">
          {tab('web', 'Web address', Globe)}
          {allowSite && tab('site', 'This site', FileText)}
          {tab('email', 'Email', Mail)}
        </div>

        {kind === 'web' && (
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#4A4A4A]">Web address</span>
            <div className="flex gap-2">
              <input className={input} value={web} onChange={e => setWeb(e.target.value)} placeholder="https://example.com/page" inputMode="url" autoComplete="off" />
              {'href' in result && (
                <a href={result.href} target="_blank" rel="noopener noreferrer" title="Open to check" aria-label="Open the link to check it"
                  className="flex shrink-0 items-center rounded-lg border border-[#E5E2D9] px-3 text-[#6B6B6B] hover:bg-[#F3F1EA]"><ExternalLink className="h-4 w-4" /></a>
              )}
            </div>
            {'href' in result && web.trim() && result.href !== web.trim() && <span className="mt-1 block text-[12px] text-[#6B6B6B]">Links to {result.href}</span>}
          </label>
        )}

        {kind === 'site' && (
          <div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8679]" aria-hidden="true" />
              <input className={cx(input, 'pl-9')} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pages and articles" aria-label="Search pages and articles" />
            </label>
            <ul role="listbox" aria-label="Pages and articles" className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[#E5E2D9]">
              {siteResults.length === 0 && <li className="px-3 py-4 text-center text-[13px] text-[#9A9A9A]">Nothing matches.</li>}
              {siteResults.map(l => (
                <li key={l.href}>
                  <button type="button" role="option" aria-selected={site === l.href} onClick={() => setSite(l.href)}
                    className={cx('flex w-full items-center justify-between gap-3 px-3 py-2 text-left', site === l.href ? 'bg-[#C89B3C]/15' : 'hover:bg-[#FBFAF6]')}>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-[#1A1A1A]">{l.label}</span>
                      <span className="block truncate text-[12px] text-[#9A9A9A]">{l.href}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#F3F1EA] px-2 py-0.5 text-[11px] text-[#6B6B6B]">{l.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {kind === 'email' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[#4A4A4A]">Email address</span>
              <input className={input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. hello@agunwamienterprise.com" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[#4A4A4A]">Subject (optional)</span>
              <input className={input} value={subject} onChange={e => setSubject(e.target.value)} />
            </label>
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#4A4A4A]">Text to show</span>
          <input className={input} value={text} onChange={e => setText(e.target.value)} placeholder={selectedText || 'e.g. Read the full report'} />
          {!needsText && <span className="mt-1 block text-[12px] text-[#9A9A9A]">Your selected text. Change it here to replace it.</span>}
        </label>

        {kind !== 'email' && (
          <label className="flex items-start gap-2 text-[13px] text-[#4A4A4A]">
            <input type="checkbox" checked={newTab} onChange={e => setNewTab(e.target.checked)} className="mt-0.5 accent-[#C89B3C]" />
            <span>Open in a new tab<span className="block text-[12px] text-[#9A9A9A]">Usually on for other websites and off for pages on this site.</span></span>
          </label>
        )}

        {touched && error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      </form>
    </AeModal>
  );
}
