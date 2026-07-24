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
  includeAdult?: boolean;
  originality?: string;
  participantId?: number;
  priceRange?: PriceRange;
  dateRange?: DateRange;
}

export type SortBy = "DATE_DESC" | "PRICE_ASC" | "PRICE_DESC";

export interface Pageable {
  size: number;
  lastCreatedAt?: string;
  lastPrice?: number;
  lastId?: number;
  sortBy?: SortBy;
}

export interface ProductRequestModel extends ProductFilter {
  pageable: Pageable;
}

export interface FetchProductsParams {
  size: number;
  filters?: ProductFilter;
  lastCreatedAt?: string;
  lastPrice?: number;
  lastId?: number;
  sortBy?: SortBy;
}
