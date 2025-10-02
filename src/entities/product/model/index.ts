// Экспорт типов
export type {
  ProductCardModel,
  ProductDetailsModel,
  ProductCreateModel,
  ProductFilter,
  ProductRequestModel,
  Availability,
  SortBy,
} from "./types";

// Экспорт типов и утилит формы
export type { ProductFormData } from "./form";
export { mapFormDataToCreateModel, defaultProductFormValues } from "./form";
