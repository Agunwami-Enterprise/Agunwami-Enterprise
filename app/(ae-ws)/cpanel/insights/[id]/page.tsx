import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import ArticleEditor from '@/app/components/cpanel/ArticleEditor';
import { getArticle, permissionsOf } from '@/backend/modules/site-content';
import { verifySession } from '@/lib/workstation/session';
import { articleActor } from '@/lib/workstation/article-actor';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, actor] = await Promise.all([getArticle(id), verifySession().then(articleActor)]);
  if (!article) notFound();
  const permissions = permissionsOf(article, actor);

  if (!permissions.canView) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F1EA]"><Lock className="h-6 w-6 text-[#8C8679]" aria-hidden="true" /></span>
        <h1 className="font-primary text-[26px] text-[#1A1A1A]">You don’t have access to this article</h1>
        <p className="max-w-md text-[15px] text-[#6B6B6B]">
          “{article.title || 'Untitled article'}” belongs to {article.owner?.name || article.owner?.email || 'someone else'}.
          Ask them to share it with you.
        </p>
        <Link href="/cpanel/insights" className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F1F1F] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-black">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All articles
        </Link>
      </div>
    );
  }

  // Keyed so saving a new article (which navigates here) starts a fresh editor.
  return (
    <ArticleEditor key={article.id} article={article} permissions={permissions}
      me={{ uid: actor.uid, name: actor.name, email: actor.email }} />
  );
}
