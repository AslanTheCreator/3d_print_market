// Экспорт типов
export type {
  Product,
  ProductDetail,
  ProductCreateModel,
  Availability,
} from "./types";

// Экспорт типов и утилит формы
export type { ProductFormData } from "./form";
export { mapFormDataToCreateModel, defaultProductFormValues } from "./form";
