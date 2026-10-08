'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card, ConfirmDelete, EmptyState, IconButton, PageHeader, cpanelFetch, cx, useMutation } from './ui';
import type { SiteArticle } from '@/backend/modules/site-content/site-content.types';

const CATEGORY_STYLES: Record<string, string> = {
  Infrastructure: 'bg-blue-50 text-blue-600',
  Design: 'bg-pink-50 text-pink-600',
  Technology: 'bg-purple-50 text-purple-600',
  Partnerships: 'bg-green-50 text-green-600',
  Insights: 'bg-amber-50 text-amber-700',
};

export function formatArticleDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

export function InsightsManager({ articles }: { articles: SiteArticle[] }) {
  const [deleting, setDeleting] = useState<SiteArticle | null>(null);
  const del = useMutation();
  const published = articles.filter(a => a.published).length;
  const drafts = articles.length - published;

  return (
    <div className="mx-auto max-w-[1075px]">
      <PageHeader title="Expert Insights"
        subtitle={`${published} article${published === 1 ? '' : 's'} published${drafts ? ` · ${drafts} draft${drafts === 1 ? '' : 's'}` : ''}`}
        action={(
          <Link href="/cpanel/insights/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1F1F1F] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-black">
            <Plus className="h-4 w-4" aria-hidden="true" /> New Article
          </Link>
        )} />
      <Card className="overflow-hidden">
        {articles.length === 0 ? <EmptyState>No articles yet. Write your first one.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#F7F5EF] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                <tr><th className="px-7 py-4">Article</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Date</th><th className="px-4 py-4"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEE8]">
                {articles.map(article => (
                  <tr key={article.id} className="hover:bg-[#FBFAF6]">
                    <td className="px-4 py-5">
                      <Link href={`/cpanel/insights/${article.id}`} className="flex items-center gap-3">
                        {article.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={article.image} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                          : <span className="h-10 w-10 shrink-0 rounded-md bg-[#F3F1EA]" />}
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[#1A1A1A]">
                            {article.title}
                            {!article.published && <span className="ml-2 rounded bg-[#F3F1EA] px-1.5 py-0.5 align-middle text-[11px] font-semibold text-[#8A8A8A]">Draft</span>}
                          </p>
                          <p className="line-clamp-2 max-w-[460px] text-[13px] text-[#9A9A9A]">{article.excerpt}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-5">
                      <span className={cx('rounded-full px-2 py-0.5 text-[12px] font-semibold', CATEGORY_STYLES[article.category])}>{article.category}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-5 text-[13px] text-[#8A8A8A]">{formatArticleDate(article.date)}</td>
                    <td className="px-4 py-5">
                      <div className="flex justify-end gap-1">
                        {article.published && <IconButton label="View on website" href={`/insights/${article.slug}`}><ExternalLink className="h-4 w-4" /></IconButton>}
                        <Link href={`/cpanel/insights/${article.id}`} aria-label={`Edit ${article.title}`} title="Edit"
                          className="rounded-md p-1.5 text-[#8A8A8A] hover:bg-[#F3F1EA] hover:text-[#1A1A1A]"><Pencil className="h-4 w-4" /></Link>
                        <IconButton label="Delete" onClick={() => { del.setError(''); setDeleting(article); }}><Trash2 className="h-4 w-4" /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ConfirmDelete open={!!deleting} kind="Article" name={deleting?.title ?? ''} effect="It will be removed from Expert Insights."
        busy={del.busy} error={del.error} onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && await del.run(() => cpanelFetch(`/api/cpanel/articles/${deleting.id}`, { method: 'DELETE' }))) setDeleting(null);
        }} />
    </div>
  );
}
