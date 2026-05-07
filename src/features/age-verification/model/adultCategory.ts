import type { CategoryPath } from "@/entities/category";

const ADULT_CATEGORY_NAMES = new Set(["nsfw (18+)", "nsfw(18+)"]);

const normalizeCategoryName = (name: string): string => {
  try {
    return decodeURIComponent(name).toLowerCase().trim();
  } catch {
    return name.toLowerCase().trim();
  }
};

export const isAdultCategoryName = (name: string): boolean => {
  return ADULT_CATEGORY_NAMES.has(normalizeCategoryName(name));
};

export const isAdultCategoryPath = (categoryPath: CategoryPath): boolean => {
  return categoryPath.breadcrumbs.some((item) =>
    isAdultCategoryName(item.name),
  );
};
