// Общие типы для запросов к API товаров

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
  imageId?: number;
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

// Параметры для запросов списка товаров
export interface FetchProductsParams {
  size: number;
  filters?: ProductFilter;
  lastCreatedAt?: string;
  lastPrice?: number;
  lastId?: number;
  sortBy?: SortBy;
}
