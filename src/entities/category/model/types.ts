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
