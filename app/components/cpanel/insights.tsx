'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, ExternalLink, Lock, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { Card, ConfirmDelete, EmptyState, IconButton, PageHeader, cpanelFetch, cx, useMutation } from './ui';
import { ARTICLE_ROLE_LABELS, type ArticleCategoryInfo } from '@/backend/modules/site-content/site-content.types';
import type { ArticleAccess } from '@/backend/modules/site-content/article-access';
import type { ArticleListItem } from '@/backend/modules/site-content/site-content.service';
import CategoryManager from './article/CategoryManager';

const CATEGORY_STYLES: Record<string, string> = {
  Infrastructure: 'bg-blue-50 text-blue-600',
  Design: 'bg-pink-50 text-pink-600',
  Technology: 'bg-purple-50 text-purple-600',
  Partnerships: 'bg-green-50 text-green-600',
  Insights: 'bg-amber-50 text-amber-700',
};
const categoryStyle = (name: string) => CATEGORY_STYLES[name] ?? 'bg-[#F3F1EA] text-[#4A4A4A]';

export function formatArticleDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

const ACCESS_BADGE: Record<ArticleAccess, { label: string; className: string }> = {
  owner: { label: 'Owner', className: 'bg-[#C89B3C]/15 text-[#8A6A1F]' },
  manager: { label: ARTICLE_ROLE_LABELS.manager, className: 'bg-blue-50 text-blue-700' },
  editor: { label: ARTICLE_ROLE_LABELS.editor, className: 'bg-green-50 text-green-700' },
  viewer: { label: ARTICLE_ROLE_LABELS.viewer, className: 'bg-[#F3F1EA] text-[#4A4A4A]' },
  unowned: { label: 'No owner yet', className: 'bg-amber-50 text-amber-700' },
  none: { label: 'No access', className: 'bg-red-50 text-red-700' },
};

/**
 * The articles this person can open, with their access; the CEO also sees the
 * rest (to delete them, not to open them).
 */
export function InsightsManager({ articles: all, isCeo }: { articles: ArticleListItem[]; isCeo: boolean }) {
  const router = useRouter();
  const articles = all.filter(a => a.permissions.canView || isCeo);
  const [deleting, setDeleting] = useState<ArticleListItem | null>(null);
  const [categories, setCategories] = useState<ArticleCategoryInfo[] | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const del = useMutation();
  const published = articles.filter(a => a.published).length;
  const drafts = articles.length - published;

  return (
    <div className="w-full">
      <PageHeader title="Expert Insights"
        subtitle={`${published} article${published === 1 ? '' : 's'} published${drafts ? ` · ${drafts} draft${drafts === 1 ? '' : 's'}` : ''}`}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setCategoryError(''); cpanelFetch<ArticleCategoryInfo[]>('/api/cpanel/article-categories').then(setCategories).catch(err => setCategoryError(err instanceof Error ? err.message : 'Could not load the categories.')); }}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E5E2D9] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#1A1A1A] hover:bg-[#F3F1EA]">
              <Tags className="h-4 w-4" aria-hidden="true" /> Categories
            </button>
            <Link href="/cpanel/insights/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1F1F1F] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-black">
              <Plus className="h-4 w-4" aria-hidden="true" /> New Article
            </Link>
          </div>
        )} />
      {categoryError && <p role="alert" className="mb-4 text-[13px] text-red-600">{categoryError}</p>}
      {categories && (
        <CategoryManager categories={categories} onChange={setCategories} onClose={() => { setCategories(null); router.refresh(); }} />
      )}
      <Card className="overflow-hidden">
        {articles.length === 0 ? <EmptyState>No articles yet. Write your first one.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#F7F5EF] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                <tr><th className="px-7 py-4">Article</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Owner &amp; access</th><th className="px-4 py-4">Date</th><th className="px-4 py-4"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEE8]">
                {articles.map(article => {
                  const can = article.permissions;
                  const badge = ACCESS_BADGE[can.access];
                  const Row = can.canView ? Link : 'div';
                  return (
                  <tr key={article.id} className={cx('hover:bg-[#FBFAF6]', !can.canView && 'opacity-80')}>
                    <td className="px-4 py-5">
                      <Row href={`/cpanel/insights/${article.id}`} className="flex items-center gap-3">
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
                          {article.tags && article.tags.length > 0 && (
                            <p className="mt-1 flex flex-wrap gap-1">{article.tags.slice(0, 5).map(tag => <span key={tag} className="rounded bg-[#F3F1EA] px-1.5 py-0.5 text-[11px] text-[#6B6B6B]">#{tag}</span>)}</p>
                          )}
                        </div>
                      </Row>
                    </td>
                    <td className="px-4 py-5">
                      <span className={cx('rounded-full px-2 py-0.5 text-[12px] font-semibold', categoryStyle(article.category))}>{article.category}</span>
                    </td>
                    <td className="px-4 py-5">
                      <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold', badge.className)}>
                        {!can.canView && <Lock className="h-3 w-3" aria-hidden="true" />}{badge.label}
                      </span>
                      {article.owner && can.access !== 'owner' && (
                        <span className="mt-1 block max-w-[180px] truncate text-[12px] text-[#8A8A8A]">Owner: {article.owner.name || article.owner.email}</span>
                      )}
                      {article.lock && (
                        <span className="mt-1 block max-w-[180px] truncate text-[12px] text-amber-700">Being edited by {article.lock.name || article.lock.email}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-5 text-[13px] text-[#8A8A8A]">{formatArticleDate(article.date)}</td>
                    <td className="px-4 py-5">
                      <div className="flex justify-end gap-1">
                        {article.published && <IconButton label="View on website" href={`/insights/${article.slug}`}><ExternalLink className="h-4 w-4" /></IconButton>}
                        {can.canView && (
                          <Link href={`/cpanel/insights/${article.id}`} aria-label={`${can.canEdit ? 'Edit' : 'View'} ${article.title}`} title={can.canEdit ? 'Edit' : 'View'}
                            className="rounded-md p-1.5 text-[#8A8A8A] hover:bg-[#F3F1EA] hover:text-[#1A1A1A]">{can.canEdit ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Link>
                        )}
                        {can.canDelete && <IconButton label="Delete" onClick={() => { del.setError(''); setDeleting(article); }}><Trash2 className="h-4 w-4" /></IconButton>}
                      </div>
                    </td>
                  </tr>
                  );
                })}
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
