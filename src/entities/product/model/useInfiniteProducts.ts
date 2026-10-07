import {
  type InfiniteData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type {
  FetchProductsParams,
  ProductFilter,
  SortBy,
} from "./productRequest";
import type { Product, ProductDto } from "./types";

export interface CursorPageParam {
  lastCreatedAt?: string;
  lastPrice?: number;
  lastId?: number;
}

export interface ProductFetchFunction<T extends ProductDto = Product> {
  (params: FetchProductsParams, signal?: AbortSignal): Promise<T[]>;
}

type QueryRetryValue =
  | boolean
  | number
  | ((failureCount: number, error: Error) => boolean);

export interface UseInfiniteProductsOptions<T extends ProductDto = Product> {
  size: number;
  filters?: ProductFilter;
  sortBy?: SortBy;
  fetchFunction: ProductFetchFunction<T>;
  queryKey: readonly unknown[];
  staleTime?: number;
  retry?: QueryRetryValue;
  initialData?: InfiniteData<T[], CursorPageParam | null>;
  initialDataUpdatedAt?: number;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
}

export const useInfiniteProducts = <T extends ProductDto = Product>({
  size,
  filters,
  sortBy = "DATE_DESC",
  fetchFunction,
  queryKey,
  staleTime = 1000 * 60 * 5,
  retry,
  initialData,
  initialDataUpdatedAt,
  enabled = true,
  refetchOnWindowFocus,
}: UseInfiniteProductsOptions<T>) => {
  return useInfiniteQuery({
    queryKey: [...queryKey, size, filters, sortBy],
    queryFn: ({ pageParam, signal }: { pageParam: CursorPageParam | null; signal: AbortSignal }) => {
      const { lastCreatedAt, lastPrice, lastId } = pageParam || {};

      return fetchFunction({
        size,
        filters,
        lastCreatedAt,
        lastPrice,
        lastId,
        sortBy,
      }, signal);
    },
    getNextPageParam: (lastPage: T[]) => {
      if (!lastPage || lastPage.length === 0 || lastPage.length < size) {
        return undefined;
      }

      const lastItem = lastPage[lastPage.length - 1];

      return {
        lastCreatedAt: lastItem.createdAt,
        lastPrice: lastItem.price,
        lastId: lastItem.id,
      };
    },
    initialPageParam: null,
    initialData,
    initialDataUpdatedAt,
    enabled,
    staleTime,
    ...(refetchOnWindowFocus !== undefined ? { refetchOnWindowFocus } : {}),
    ...(retry !== undefined ? { retry } : {}),
  });
};
