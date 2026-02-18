// API
export { categoryApi } from "./api/categoryApi";

// Query keys
export { categoryKeys } from "./hooks/queryKeys";

// Hooks
export { useCategories, useCategoryById } from "./hooks/useCategories";

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
