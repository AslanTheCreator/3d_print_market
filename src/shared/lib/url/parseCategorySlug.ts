/**
 * Извлекает ID категории из slug
 * @example "123-electronics" -> 123
 */
export const parseCategoryId = (slug: string): number | null => {
  const categoryIdString = slug.split("-")[0];
  const categoryId = parseInt(categoryIdString, 10);
  return isNaN(categoryId) ? null : categoryId;
};

/**
 * Извлекает название категории из slug
 * @example "123-electronics-phones" -> "electronics phones"
 */
export const parseCategoryName = (slug: string): string => {
  const parts = slug.split("-");
  return parts.slice(1).join(" ").replace(/-/g, " ");
};

/**
 * Извлекает ID последней категории из массива slug'ов
 * Используется для определения текущей активной категории
 */
export const extractLastCategoryId = (
  slugs: string[] | string
): number | null => {
  if (!slugs) return null;

  const slugArray = Array.isArray(slugs) ? slugs : [slugs];
  if (slugArray.length === 0) return null;

  const lastSlug = slugArray[slugArray.length - 1];
  return parseCategoryId(lastSlug);
};

/**
 * Нормализует slug параметр в массив
 */
export const normalizeSlugParam = (
  slugs: string[] | string | undefined
): string[] => {
  if (!slugs) return [];
  return Array.isArray(slugs) ? slugs : [slugs];
};
