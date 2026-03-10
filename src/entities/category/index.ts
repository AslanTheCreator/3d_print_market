// API
export { categoryApi } from "./api/categoryApi";

// Query keys
export { categoryKeys } from "./model/queryKeys";

// Hooks
export { useCategories, useCategoryById } from "./model/useCategories";

// Types
export type { BreadcrumbItem, CategoryPath } from "./model/types";

// UI
export { CategoryBreadcrumbs } from "./ui/CategoryBreadcrumbs";

// Lib
export {
  createBreadcrumbs,
  generateCategoryTitle,
} from "./lib/createBreadcrumbs";
export { getCategorySlug, buildCategoryPath } from "./lib/categorySlug";
export { getCategoryIcon } from "./lib/categoryIcons";