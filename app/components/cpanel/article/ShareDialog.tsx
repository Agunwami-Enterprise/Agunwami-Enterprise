'use client';

/**
 * Share an article: the owner and managers choose who else can view, edit or
 * manage it; the owner can hand it to someone else. An article from before
 * sharing has no owner until someone makes themselves its owner.
 */

import { useMemo, useState } from 'react';
import { Crown, Loader2, Search, Trash2, UserPlus } from 'lucide-react';
import AeModal, { useConfirm } from '@/app/components/common/AeModal';
import {
  ARTICLE_ROLES, ARTICLE_ROLE_LABELS, type ArticleCollaborator, type ArticlePerson, type ArticleRole, type SiteArticle,
} from '@/backend/modules/site-content/site-content.types';
import type { ArticlePermissions } from '@/backend/modules/site-content/article-access';
import type { AuthorOption } from '@/app/api/cpanel/people/route';
import { cpanelFetch, cx } from '../ui';

const ROLE_HELP: Record<ArticleRole, string> = {
  viewer: 'Can read it',
  editor: 'Can change and save it',
  manager: 'Can edit, publish and share it',
};

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C89B3C]/15 text-[13px] font-semibold text-[#8A6A1F]">
      {(name.trim()[0] || '?').toUpperCase()}
    </span>
  );
}

export default function ShareDialog({ article, permissions, me, people, onChanged, onClose }: {
  article: SiteArticle;
  permissions: ArticlePermissions;
  me: ArticlePerson;
  /** AE accounts (with a uid) who can be given access. */
  people: AuthorOption[] | null;
  onChanged: (article: SiteArticle) => void;
  onClose: () => void;
}) {
  const confirm = useConfirm();
  const [list, setList] = useState<ArticleCollaborator[]>(article.collaborators ?? []);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<ArticleRole>('editor');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const owner = article.owner;
  const editable = permissions.canShare;
  const dirty = JSON.stringify(list) !== JSON.stringify(article.collaborators ?? []);

  const candidates = useMemo(() => {
    const seen = new Set([owner?.uid, ...list.map(c => c.uid)]);
    const unique = new Map<string, AuthorOption>();
    for (const p of people ?? []) if (p.uid && !seen.has(p.uid) && !unique.has(p.uid)) unique.set(p.uid, p);
    const term = query.trim().toLowerCase();
    return [...unique.values()].filter(p => !term || p.name.toLowerCase().includes(term) || (p.email ?? '').toLowerCase().includes(term) || p.role.toLowerCase().includes(term)).slice(0, 8);
  }, [people, owner?.uid, list, query]);

  async function run<T>(key: string, action: () => Promise<T>): Promise<T | null> {
    setBusy(key);
    setError('');
    try {
      return await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t work. Please try again.');
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    const saved = await run('save', () => cpanelFetch<SiteArticle>(`/api/cpanel/articles/${article.id}/access`, { method: 'PUT', json: { collaborators: list } }));
    if (saved) { onChanged(saved); onClose(); }
  }

  async function transfer(person: ArticleCollaborator) {
    const ok = await confirm({
      title: `Make ${person.name || person.email} the owner?`,
      message: 'They’ll be able to do everything with this article, including deleting it and handing it on. You’ll keep manage access.',
      confirmLabel: 'Transfer ownership',
    });
    if (!ok) return;
    const saved = await run(`owner:${person.uid}`, () => cpanelFetch<SiteArticle>(`/api/cpanel/articles/${article.id}/access`, {
      method: 'POST', json: { action: 'transfer', owner: { uid: person.uid, name: person.name, email: person.email } },
    }));
    if (saved) { onChanged(saved); onClose(); }
  }

  async function claim() {
    const saved = await run('claim', () => cpanelFetch<SiteArticle>(`/api/cpanel/articles/${article.id}/access`, { method: 'POST', json: { action: 'claim' } }));
    if (saved) { onChanged(saved); setList(saved.collaborators ?? []); }
  }

  const select = 'rounded-lg border border-[#E5E2D9] bg-white px-2 py-1.5 text-[13px] text-[#1A1A1A] outline-none focus:border-[#C89B3C] disabled:bg-[#F7F6F2] disabled:text-[#8C8679]';

  return (
    <AeModal title="Share article" description={article.title || 'Untitled article'} onClose={onClose} dismissible={!busy} size="lg"
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={!!busy} className="rounded-lg border border-[#E5E2D9] px-4 py-2 text-[13px] font-medium text-[#4A4A4A] hover:bg-[#F3F1EA] disabled:opacity-50">
            {editable && dirty ? 'Cancel' : 'Close'}
          </button>
          {editable && (
            <button type="button" onClick={() => void save()} disabled={!dirty || !!busy}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1F1F1F] px-4 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">
              {busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save access
            </button>
          )}
        </>
      )}>
      <div className="space-y-5">
        {!owner ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
            <p className="font-semibold">This article has no owner yet.</p>
            <p className="mt-1">It was written before sharing existed, so anyone with C-panel access can edit it. Make yourself the owner to choose who can view, edit or manage it.</p>
            {permissions.canClaim && (
              <button type="button" onClick={() => void claim()} disabled={!!busy}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1F1F1F] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-50">
                {busy === 'claim' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crown className="h-4 w-4" aria-hidden="true" />} Make me the owner
              </button>
            )}
          </div>
        ) : (
          <>
            {editable && (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-[#3A3A3A]">Add people</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Find a person</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8679]" aria-hidden="true" />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder={people === null ? 'Loading people…' : 'Search people in AE by name or email'}
                      className="w-full rounded-lg border border-[#E5E2D9] bg-white py-2 pl-9 pr-3 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#8C8679] focus:border-[#C89B3C]" />
                  </label>
                  <select value={role} onChange={e => setRole(e.target.value as ArticleRole)} aria-label="Access for people you add" className={select}>
                    {ARTICLE_ROLES.map(r => <option key={r} value={r}>{ARTICLE_ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                {query.trim() && (
                  <ul className="max-h-56 overflow-y-auto rounded-lg border border-[#E5E2D9]">
                    {candidates.length === 0 && <li className="px-3 py-3 text-center text-[13px] text-[#9A9A9A]">No one in AE matches.</li>}
                    {candidates.map(p => (
                      <li key={p.uid}>
                        <button type="button" onClick={() => { setList(l => [...l, { uid: p.uid!, name: p.name, email: p.email ?? '', role }]); setQuery(''); }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#FBFAF6]">
                          <Avatar name={p.name} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium text-[#1A1A1A]">{p.name}</span>
                            <span className="block truncate text-[12px] text-[#6B6B6B]">{[p.role, p.email].filter(Boolean).join(' · ')}</span>
                          </span>
                          <UserPlus className="h-4 w-4 text-[#8C8679]" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div>
              <p className="mb-2 text-[13px] font-medium text-[#3A3A3A]">People with access</p>
              <ul className="divide-y divide-[#F0EEE8] rounded-lg border border-[#E5E2D9]">
                <li className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={owner.name || owner.email} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[#1A1A1A]">{owner.name || owner.email}{owner.uid === me.uid && ' (you)'}</span>
                    <span className="block truncate text-[12px] text-[#6B6B6B]">{owner.email}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#C89B3C]/15 px-2.5 py-1 text-[12px] font-semibold text-[#8A6A1F]"><Crown className="h-3.5 w-3.5" aria-hidden="true" /> Owner</span>
                </li>
                {list.map(person => (
                  <li key={person.uid} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <Avatar name={person.name || person.email} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[#1A1A1A]">{person.name || person.email}{person.uid === me.uid && ' (you)'}</span>
                      <span className="block truncate text-[12px] text-[#6B6B6B]">{person.email}</span>
                    </span>
                    <select value={person.role} disabled={!editable} aria-label={`Access for ${person.name || person.email}`} title={ROLE_HELP[person.role]}
                      onChange={e => setList(l => l.map(c => (c.uid === person.uid ? { ...c, role: e.target.value as ArticleRole } : c)))} className={select}>
                      {ARTICLE_ROLES.map(r => <option key={r} value={r}>{ARTICLE_ROLE_LABELS[r]}</option>)}
                    </select>
                    {permissions.canTransfer && (
                      <button type="button" disabled={!!busy || dirty} onClick={() => void transfer(person)}
                        title={dirty ? 'Save access changes first' : `Make ${person.name || person.email} the owner`}
                        className="rounded-md px-2 py-1.5 text-[12px] font-semibold text-[#8A6A1F] hover:bg-[#C89B3C]/10 disabled:opacity-40">
                        {busy === `owner:${person.uid}` ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Make owner'}
                      </button>
                    )}
                    {editable && (
                      <button type="button" disabled={!!busy} onClick={() => setList(l => l.filter(c => c.uid !== person.uid))} aria-label={`Remove ${person.name || person.email}`}
                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </li>
                ))}
              </ul>
              {list.length === 0 && <p className="mt-2 text-[12px] text-[#8C8679]">Only the owner can open this article{editable ? '. Add people above.' : '.'}</p>}
            </div>
          </>
        )}

        <ul className={cx('grid gap-2 text-[12px] text-[#6B6B6B] sm:grid-cols-3')}>
          {ARTICLE_ROLES.map(r => (
            <li key={r} className="rounded-lg bg-[#FBFAF6] px-3 py-2"><span className="block font-semibold text-[#3A3A3A]">{ARTICLE_ROLE_LABELS[r]}</span>{ROLE_HELP[r]}</li>
          ))}
        </ul>
        <p className="text-[12px] text-[#6B6B6B]">
          Only one person can edit at a time; others see it read-only meanwhile. People also need C-panel access from their department.
          The CEO can delete any article, but opens only those shared with them.
        </p>
        {!editable && owner && <p className="text-[12px] text-[#6B6B6B]">Only the owner and managers can change who has access.</p>}
        {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      </div>
    </AeModal>
  );
}
