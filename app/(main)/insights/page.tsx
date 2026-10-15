import InsightsBrowser from "@/app/components/insights/InsightsBrowser";
import { formatArticleDate, getPublishedArticles, getSiteSettings } from "@/lib/site/content";

// Rendered per request from C-panel content (cached briefly in lib/site/content).
export const dynamic = "force-dynamic";

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const [published, { articleCategories }] = await Promise.all([getPublishedArticles(), getSiteSettings()]);
  // Tabs for the categories that have articles, in the C-panel's order.
  const used = new Set(published.map((article) => article.category));
  const categories = [...articleCategories.filter((name) => used.has(name)), ...[...used].filter((name) => !articleCategories.includes(name))];
  const articles = published.map((article) => ({
    id: article.id,
    slug: article.slug,
    title: article.title,
    category: article.category,
    excerpt: article.excerpt,
    tags: article.tags ?? [],
    date: formatArticleDate(article.date),
    image: article.image || "/insightshero.jpg",
  }));
  return <InsightsBrowser articles={articles} categories={categories} initialQuery={typeof q === "string" ? q.slice(0, 80) : ""} />;
}
