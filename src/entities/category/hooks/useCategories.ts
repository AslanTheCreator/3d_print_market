// @/entities/category/model/useCategories.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CategoryModel,
  UseCategoriesReturn,
} from "@/shared/model/types/category";
import { categoryApi } from "../api/categoryApi";

export const useCategories = (): UseCategoriesReturn => {
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error("Ошибка при загрузке категорий:", err);
      setError("Не удалось загрузить категории. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const refresh = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refresh,
  };
};

// Хук для поиска категории по ID
export const useCategoryById = (id: number) => {
  const { categories, loading, error } = useCategories();

  const findCategoryById = useCallback(
    (categories: CategoryModel[], targetId: number): CategoryModel | null => {
      for (const category of categories) {
        if (category.id === targetId) {
          return category;
        }
        if (category.childs && category.childs.length > 0) {
          const found = findCategoryById(category.childs, targetId);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  const category = findCategoryById(categories, id);

  return {
    category,
    loading,
    error,
  };
};
