import type { MetadataRoute } from "next";
import { SITE_INFO } from "@/shared/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalog"],
        disallow: [
          "/api/",
          "/dashboard",
        ],
      },
    ],
    sitemap: `${SITE_INFO.url}/sitemap.xml`,
    host: SITE_INFO.url,
  };
}
