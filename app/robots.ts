import type { MetadataRoute } from "next";

const SITE_URL = "https://figurzilla.ru";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalog"],
        disallow: [
          "/api/",
          "/auth/",
          "/checkout",
          "/dashboard",
          "/favorites",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
