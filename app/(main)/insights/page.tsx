import InsightsBrowser from "@/app/components/insights/InsightsBrowser";
import { formatArticleDate, getPublishedArticles } from "@/lib/site/content";

// Rendered per request from C-panel content (cached briefly in lib/site/content).
export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const articles = (await getPublishedArticles()).map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    date: formatArticleDate(article.date),
    image: article.image || "/insightshero.jpg",
  }));
  return <InsightsBrowser articles={articles} />;
}
