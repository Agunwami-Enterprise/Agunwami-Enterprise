import type { MetadataRoute } from "next";
import { getPublishedArticles, getSiteProjects } from "@/lib/site/content";

const BASE_URL = "https://agunwamienterprise.com";

// Rendered per request from C-panel content (cached briefly in lib/site/content).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, articles] = await Promise.all([getSiteProjects(), getPublishedArticles()]);
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/projects`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/ecosystem`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/insights`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/partnerships`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/partnerships/apply`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Dynamically include all public project detail pages
  const projectRoutes: MetadataRoute.Sitemap = projects
    .filter((p) => p.link && p.link.startsWith("/projects/"))
    .map((p) => {
      const slug = p.link.replace(/^\/projects\//, "");
      return {
        url: `${BASE_URL}/projects/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.75,
      };
    });

  // Dynamically include all published insights articles
  const insightRoutes: MetadataRoute.Sitemap = articles.map((article) => {
    const parsedDate = new Date(article.date);
    return {
      url: `${BASE_URL}/insights/${article.slug}`,
      lastModified: !isNaN(parsedDate.getTime()) ? parsedDate : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    };
  });

  return [...staticRoutes, ...projectRoutes, ...insightRoutes];
}
