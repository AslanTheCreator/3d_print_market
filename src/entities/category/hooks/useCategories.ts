import { useQuery } from "@tanstack/react-query";
import { categoryApi } from "../api/categoryApi";
import { categoryKeys } from "./queryKeys";
import { CategoryModel } from "@/shared/types";

export const useCategories = () => {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: categoryApi.getCategories,
    staleTime: 10 * 60 * 1000, // 10 минут — категории редко меняются
    gcTime: 30 * 60 * 1000,
  });
};

// Рекурсивный поиск категории по ID в дереве
const findCategoryById = (
  categories: CategoryModel[],
  targetId: number,
): CategoryModel | null => {
  for (const category of categories) {
    if (category.id === targetId) {
      return category;
    }
    if (category.childs?.length) {
      const found = findCategoryById(category.childs, targetId);
      if (found) return found;
    }
  }
  return null;
};

export const useCategoryById = (id: number) => {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: categoryApi.getCategories,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    select: (categories) => findCategoryById(categories, id),
    enabled: id > 0,
  });
};
