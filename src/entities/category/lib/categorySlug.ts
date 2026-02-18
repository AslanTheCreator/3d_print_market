import { CategoryModel } from "@/shared/types";

/**
 * Генерирует slug для категории
 * @example getCategorySlug({ id: 5, name: "Телефоны" }) => "5-%D0%A2%D0%B5%D0%BB%D0%B5%D1%84%D0%BE%D0%BD%D1%8B"
 */
export const getCategorySlug = (category: CategoryModel): string => {
  const normalizedName = category.name.toLowerCase().replace(/\s+/g, "-");
  return `${category.id}-${encodeURIComponent(normalizedName)}`;
};

/**
 * Строит полный путь категории в каталоге
 * @param parentSlugs - slug'и родительских категорий
 * @param category - текущая категория
 */
export const buildCategoryPath = (
  parentSlugs: string[],
  category: CategoryModel,
): string => {
  const currentSlug = getCategorySlug(category);
  return `/catalog/category/${[...parentSlugs, currentSlug].join("/")}`;
};
