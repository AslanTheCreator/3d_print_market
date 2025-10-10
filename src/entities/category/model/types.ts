export interface CategoryModel {
  id: number;
  name: string;
  childs: CategoryModel[];
}

// Хук для работы с категориями
export interface UseCategoriesReturn {
  categories: CategoryModel[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  path: string;
  isLast: boolean;
}

export interface CategoryPath {
  categoryId: number;
  breadcrumbs: BreadcrumbItem[];
  title: string;
}
