export {
  CurrencyField,
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  ProductGridItem,
  ProductFormFields,
  ProductPriceDisplay,
} from "./ui";
export { ProductDetailsSkeleton } from "./ui/ProductDetailsSkeleton";

export type { ProductFormData } from "./model/form";
export type { EditableAvailability } from "./model/types";
export {
  defaultProductFormValues,
  getCurrencySymbol,
  isEditableAvailability,
  mapFormDataToCreateModel,
  mapProductDetailToFormData,
  productCategoryRules,
  productCountRules,
  productCurrencies,
  productCurrencyRules,
  productDescriptionRules,
  productNameRules,
  productPrepaymentRules,
  productPriceRules,
} from "./model/form";
export type { ExpirationStatus } from "./lib/productExpirationUtils";
export {
  getExpirationStatus,
  formatExpirationDate,
} from "./lib/productExpirationUtils";

export { productApi } from "./api/productApi";
export { buildProductRequest } from "./lib/buildProductRequest";
export * from "./model";
