import { extractLastCategoryId, normalizeSlugParam } from "@/shared/lib";
import type { CategoryModel } from "@/shared/types";
import type { CategoryPath } from "../model/types";
import { createBreadcrumbs, generateCategoryTitle } from "./createBreadcrumbs";

const collectCategoryNames = (
  categories: CategoryModel[],
  namesById = new Map<number, string>(),
): Map<number, string> => {
  for (const category of categories) {
    namesById.set(category.id, category.name);

    if (category.childs?.length) {
      collectCategoryNames(category.childs, namesById);
    }
  }

  return namesById;
};

export const getCategoryPathFromSlugs = (
  slugs: string[] | string | undefined,
  categories: CategoryModel[] = [],
): CategoryPath | null => {
  const normalizedSlugs = normalizeSlugParam(slugs);

  if (normalizedSlugs.length === 0) return null;

  const categoryId = extractLastCategoryId(normalizedSlugs);

  if (!categoryId) return null;

  const categoryNamesById = collectCategoryNames(categories);

  return {
    categoryId,
    breadcrumbs: createBreadcrumbs(normalizedSlugs, categoryNamesById),
    title: generateCategoryTitle(normalizedSlugs, categoryNamesById),
  };
};
