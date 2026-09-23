import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Disallow internal workstation, auth routes, and static media from indexing
        disallow: ["/api/", "/ceo/", "/auth/", "/_next/static/media/"],
      },
    ],
    sitemap: "https://agunwamienterprise.com/sitemap.xml",
  };
}
