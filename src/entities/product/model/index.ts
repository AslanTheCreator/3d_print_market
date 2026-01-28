// Экспорт типов
export type {
  Product,
  ProductDetail,
  ProductCreateModel,
  ProductFilter,
  ProductRequestModel,
  Availability,
  SortBy,
} from "./types";

// Экспорт типов и утилит формы
export type { ProductFormData } from "./form";
export { mapFormDataToCreateModel, defaultProductFormValues } from "./form";
