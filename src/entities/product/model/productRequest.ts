export interface PriceRange {
  minPrice?: number;
  maxPrice?: number;
}

export interface DateRange {
  start?: string;
  end?: string;
}

export interface ProductFilter {
  name?: string;
  categoryId?: number;
  originality?: string;
  participantId?: number;
  priceRange?: PriceRange;
  dateRange?: DateRange;
}

// Each sort uses one DTO field and its corresponding pageable field.
export const productSortFields = {
  DATE_DESC: ["createdAt", "lastCreatedAt"],
  DATE_ASC: ["createdAt", "lastCreatedAt"],
  PRICE_ASC: ["price", "lastPrice"],
  PRICE_DESC: ["price", "lastPrice"],
  SELLER_RATING_ASC: ["sellerRating", "lastSellerRating"],
  SELLER_RATING_DESC: ["sellerRating", "lastSellerRating"],
} as const;

export type SortBy = keyof typeof productSortFields;

export interface Pageable {
  size: number;
  lastCreatedAt?: string;
  lastPrice?: number;
  lastSellerRating?: number | null;
  lastId?: number;
  sortBy?: SortBy;
}

export interface ProductRequestModel extends ProductFilter {
  pageable: Pageable;
}

export interface FetchProductsParams extends Pageable {
  filters?: ProductFilter;
}
