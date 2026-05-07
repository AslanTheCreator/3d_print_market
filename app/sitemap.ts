import type { MetadataRoute } from "next";

const SITE_URL = "https://figurzilla.ru";

const publicRoutes = [
  "/",
  "/catalog/search",
  "/about",
  "/contacts",
  "/privacy",
  "/user-agreement",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
