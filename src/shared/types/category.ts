export interface CategoryModel {
  id: number;
  name: string;
  childs: CategoryModel[];
}
