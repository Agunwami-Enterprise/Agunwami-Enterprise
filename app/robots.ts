import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Disallow internal workstation and auth routes from public indexing
        disallow: ["/api/", "/ceo/", "/auth/"],
      },
    ],
    sitemap: "https://agunwamienterprise.com/sitemap.xml",
  };
}
