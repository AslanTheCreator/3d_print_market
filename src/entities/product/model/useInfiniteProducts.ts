import {
  type InfiniteData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type {
  FetchProductsParams,
  ProductFilter,
  SortBy,
} from "./productRequest";
import type { Product } from "./types";

export interface CursorPageParam {
  lastCreatedAt?: string;
  lastPrice?: number;
  lastId?: number;
}

export interface ProductFetchFunction {
  (params: FetchProductsParams): Promise<Product[]>;
}

type QueryRetryValue =
  | boolean
  | number
  | ((failureCount: number, error: Error) => boolean);

export interface UseInfiniteProductsOptions {
  size: number;
  filters?: ProductFilter;
  sortBy?: SortBy;
  fetchFunction: ProductFetchFunction;
  queryKey: readonly unknown[];
  staleTime?: number;
  retry?: QueryRetryValue;
  initialData?: InfiniteData<Product[], CursorPageParam | null>;
  initialDataUpdatedAt?: number;
  enabled?: boolean;
}

export const useInfiniteProducts = ({
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
}: UseInfiniteProductsOptions) => {
  return useInfiniteQuery({
    queryKey: [...queryKey, size, filters, sortBy],
    queryFn: ({ pageParam }: { pageParam: CursorPageParam | null }) => {
      const { lastCreatedAt, lastPrice, lastId } = pageParam || {};

      return fetchFunction({
        size,
        filters,
        lastCreatedAt,
        lastPrice,
        lastId,
        sortBy,
      });
    },
    getNextPageParam: (lastPage: Product[]) => {
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
    ...(retry !== undefined ? { retry } : {}),
  });
};
