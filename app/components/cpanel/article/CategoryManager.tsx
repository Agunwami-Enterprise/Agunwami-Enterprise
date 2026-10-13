'use client';

/**
 * Add, rename and remove article categories. Renaming moves the category's
 * articles with it; a category can be removed once no article is in it.
 * The Insights page shows a tab for each category that has articles.
 */

import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import AeModal from '@/app/components/common/AeModal';
import type { ArticleCategoryInfo } from '@/backend/modules/site-content/site-content.types';
import { MAX_CATEGORY_LENGTH } from '@/backend/modules/site-content/site-content.types';
import { cpanelFetch, cx } from '../ui';

const API = '/api/cpanel/article-categories';
const input = 'w-full rounded-lg border border-[#E5E2D9] bg-white px-3 py-2 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#8C8679] focus:border-[#C89B3C]';

export default function CategoryManager({ categories, onChange, onClose, onPick }: {
  categories: ArticleCategoryInfo[];
  onChange: (next: ArticleCategoryInfo[]) => void;
  onClose: () => void;
  /** When given (in the editor), a newly added category is picked for the article. */
  onPick?: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ from: string; to: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function run(key: string, action: () => Promise<ArticleCategoryInfo[]>, after?: () => void) {
    setBusy(key);
    setError('');
    try {
      onChange(await action());
      after?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t work. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    void run('add', () => cpanelFetch(API, { method: 'POST', json: { name: value } }), () => { setName(''); onPick?.(value); });
  }

  function rename() {
    if (!editing) return;
    const to = editing.to.trim();
    if (!to || to === editing.from) { setEditing(null); return; }
    void run(`rename:${editing.from}`, () => cpanelFetch(API, { method: 'PATCH', json: { from: editing.from, to } }), () => setEditing(null));
  }

  return (
    <AeModal title="Article categories" onClose={onClose} dismissible={!busy}
      footer={<button type="button" onClick={onClose} className="rounded-lg bg-[#1F1F1F] px-4 py-2 text-[13px] font-semibold text-white hover:bg-black">Done</button>}>
      <div className="space-y-4">
        <form onSubmit={add} className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">New category name</span>
            <input className={input} value={name} maxLength={MAX_CATEGORY_LENGTH} onChange={e => setName(e.target.value)} placeholder="New category, e.g. Case Studies" autoFocus />
          </label>
          <button type="submit" disabled={!name.trim() || !!busy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1F1F1F] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">
            {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />} Add
          </button>
        </form>

        <ul className="divide-y divide-[#F0EEE8] rounded-lg border border-[#E5E2D9]">
          {categories.map(c => {
            const isEditing = editing?.from === c.name;
            const rowBusy = busy === `rename:${c.name}` || busy === `remove:${c.name}`;
            return (
              <li key={c.name} className="flex items-center gap-2 px-3 py-2">
                {isEditing ? (
                  <form className="flex min-w-0 flex-1 items-center gap-1" onSubmit={e => { e.preventDefault(); rename(); }}>
                    <input className={cx(input, 'py-1.5')} value={editing.to} maxLength={MAX_CATEGORY_LENGTH} autoFocus aria-label={`New name for ${c.name}`}
                      onChange={e => setEditing({ from: c.name, to: e.target.value })} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEditing(null); } }} />
                    <button type="submit" disabled={rowBusy} title="Save name" aria-label="Save name" className="rounded-md p-2 text-green-700 hover:bg-green-50">
                      {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => setEditing(null)} title="Cancel" aria-label="Cancel" className="rounded-md p-2 text-[#6B6B6B] hover:bg-[#F3F1EA]"><X className="h-4 w-4" /></button>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#1A1A1A]">{c.name}</span>
                    <span className="shrink-0 text-[12px] text-[#8C8679]">{c.articles} article{c.articles === 1 ? '' : 's'}</span>
                    <button type="button" disabled={!!busy} onClick={() => setEditing({ from: c.name, to: c.name })} title={`Rename ${c.name}`} aria-label={`Rename ${c.name}`}
                      className="rounded-md p-2 text-[#6B6B6B] hover:bg-[#F3F1EA] disabled:opacity-40"><Pencil className="h-4 w-4" /></button>
                    <button type="button" disabled={!!busy || c.articles > 0 || categories.length <= 1}
                      title={c.articles > 0 ? 'Move its articles to another category before removing it' : `Remove ${c.name}`} aria-label={`Remove ${c.name}`}
                      onClick={() => void run(`remove:${c.name}`, () => cpanelFetch(`${API}?name=${encodeURIComponent(c.name)}`, { method: 'DELETE' }))}
                      className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:text-[#C9C4B6] disabled:hover:bg-transparent">
                      {busy === `remove:${c.name}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-[12px] text-[#6B6B6B]">Renaming a category moves its articles with it. A category can be removed once it has no articles. The Insights page shows a tab for each category with published articles.</p>
        {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      </div>
    </AeModal>
  );
}
