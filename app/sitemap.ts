import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/data/insightsData";
import { projects } from "@/lib/dummy";

const BASE_URL = "https://agunwamienterprise.com";

export default function sitemap(): MetadataRoute.Sitemap {
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
  const insightRoutes: MetadataRoute.Sitemap = ARTICLES.map((article) => {
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
