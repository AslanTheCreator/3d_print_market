export {
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  ProductGridItem,
  ProductFormFields,
  ProductPriceDisplay,
} from "./ui";
export { ProductDetailsSkeleton } from "./ui/ProductDetailsSkeleton";

export type { ProductFormData } from "./model/form";
export {
  mapFormDataToCreateModel,
  defaultProductFormValues,
} from "./model/form";
export type { ExpirationStatus } from "./lib/productExpirationUtils";
export {
  getExpirationStatus,
  formatExpirationDate,
} from "./lib/productExpirationUtils";

export { productApi } from "./api/productApi";
export * from "./model";