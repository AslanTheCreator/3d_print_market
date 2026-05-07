import { useMemo } from "react";
import { extractLastCategoryId, normalizeSlugParam } from "@/shared/lib";
import {
  createBreadcrumbs,
  generateCategoryTitle,
  useCategories,
} from "@/entities/category";
import type { CategoryPath } from "@/entities/category";
import type { CategoryModel } from "@/shared/types";

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

export const useCategoryFilter = (
  slugs: string[] | string | undefined,
): CategoryPath | null => {
  const { data: categories = [] } = useCategories();
  const categoryNamesById = useMemo(() => {
    return collectCategoryNames(categories);
  }, [categories]);

  return useMemo(() => {
    const normalizedSlugs = normalizeSlugParam(slugs);

    if (normalizedSlugs.length === 0) return null;

    const categoryId = extractLastCategoryId(normalizedSlugs);

    if (!categoryId) return null;

    return {
      categoryId,
      breadcrumbs: createBreadcrumbs(normalizedSlugs, categoryNamesById),
      title: generateCategoryTitle(normalizedSlugs, categoryNamesById),
    };
  }, [categoryNamesById, slugs]);
};
