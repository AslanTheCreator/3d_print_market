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
