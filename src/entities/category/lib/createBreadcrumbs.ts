import { parseCategoryId, parseCategoryName } from "@/shared/lib";
import type { BreadcrumbItem } from "../model/types";

/**
 * Создает элементы хлебных крошек из массива slug'ов
 * @example ["1-electronics", "2-phones"] -> [{id: "1", name: "electronics", ...}, ...]
 */
export const createBreadcrumbs = (slugs: string[]): BreadcrumbItem[] => {
  return slugs.map((slug, index) => {
    const categoryId = parseCategoryId(slug);
    const categoryName = parseCategoryName(slug);

    // Создаем путь для текущего уровня
    const path = `/catalog/category/${slugs.slice(0, index + 1).join("/")}`;

    return {
      id: String(categoryId),
      name: categoryName || `Категория ${categoryId}`,
      path,
      isLast: index === slugs.length - 1,
    };
  });
};

/**
 * Генерирует заголовок страницы на основе пути категорий
 */
export const generateCategoryTitle = (slugs: string[]): string => {
  if (slugs.length === 0) return "Каталог товаров";

  const lastSlug = slugs[slugs.length - 1];
  const categoryName = parseCategoryName(lastSlug);

  return categoryName
    ? `Товары категории "${categoryName}"`
    : "Каталог товаров";
};
