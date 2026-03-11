import { useMemo } from "react";
import { extractLastCategoryId, normalizeSlugParam } from "@/shared/lib";
import { createBreadcrumbs, generateCategoryTitle } from "@/entities/category";
import type { CategoryPath } from "@/entities/category";

export const useCategoryFilter = (
  slugs: string[] | string | undefined,
): CategoryPath | null => {
  return useMemo(() => {
    const normalizedSlugs = normalizeSlugParam(slugs);

    if (normalizedSlugs.length === 0) return null;

    const categoryId = extractLastCategoryId(normalizedSlugs);

    if (!categoryId) return null;

    return {
      categoryId,
      breadcrumbs: createBreadcrumbs(normalizedSlugs),
      title: generateCategoryTitle(normalizedSlugs),
    };
  }, [slugs]);
};
