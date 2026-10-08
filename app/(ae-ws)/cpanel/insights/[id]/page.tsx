import { notFound } from 'next/navigation';
import ArticleEditor from '@/app/components/cpanel/ArticleEditor';
import { getArticle } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticle(id);
  if (!article) notFound();
  // Keyed so saving a new article (which navigates here) starts a fresh editor.
  return <ArticleEditor key={article.id} article={article} />;
}
