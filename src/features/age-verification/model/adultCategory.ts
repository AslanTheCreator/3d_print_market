import type { CategoryPath } from "@/entities/category";

const ADULT_CATEGORY_NAMES = new Set([
  "18+",
  "nsfw (18+)",
  "nsfw(18+)",
  "nsfw_adult",
  "nsfw adult",
]);
const ADULT_CATEGORY_SLUGS = new Set(["18+", "nsfw_adult", "nsfw-adult"]);

const normalizeCategoryName = (name: string): string => {
  try {
    return decodeURIComponent(name).toLowerCase().trim();
  } catch {
    return name.toLowerCase().trim();
  }
};

const normalizeCategorySlug = (slug: string): string => {
  try {
    return decodeURIComponent(slug).toLowerCase().trim();
  } catch {
    return slug.toLowerCase().trim();
  }
};

export const isAdultCategoryName = (name: string): boolean => {
  return ADULT_CATEGORY_NAMES.has(normalizeCategoryName(name));
};

export const isAdultCategorySlug = (slug: string): boolean => {
  const normalizedSlug = normalizeCategorySlug(slug);
  return [...ADULT_CATEGORY_SLUGS].some((adultSlug) =>
    normalizedSlug.includes(adultSlug),
  );
};

export const isAdultCategoryPath = (categoryPath: CategoryPath): boolean => {
  return categoryPath.breadcrumbs.some((item) =>
    isAdultCategoryName(item.name) || isAdultCategorySlug(item.path),
  );
};
