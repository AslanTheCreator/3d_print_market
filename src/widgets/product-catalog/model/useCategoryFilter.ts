import { useMemo } from "react";
import { getCategoryPathFromSlugs, useCategories } from "@/entities/category";
import type { CategoryPath } from "@/entities/category";

export const useCategoryFilter = (
  slugs: string[] | string | undefined,
): CategoryPath | null => {
  const { data: categories = [] } = useCategories();

  return useMemo(
    () => getCategoryPathFromSlugs(slugs, categories),
    [categories, slugs],
  );
};
