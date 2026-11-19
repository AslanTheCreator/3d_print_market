import {
  type InfiniteData,
  useInfiniteQuery,
  hashKey,
} from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  productSortFields,
  type FetchProductsParams,
  type Pageable,
  type ProductFilter,
  type SortBy,
} from "./productRequest";
import type { Product, ProductDto } from "./types";

export type CursorPageParam = Pick<Pageable, "lastCreatedAt" | "lastPrice" | "lastSellerRating"> & { lastId: number };

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
  const fullQueryKey = [...queryKey, size, filters, sortBy];
  const queryHash = hashKey(fullQueryKey);
  const [failedPageKey, setFailedPageKey] = useState<string | null>(null);
  useEffect(() => setFailedPageKey(null), [queryHash]);
  const query = useInfiniteQuery({
    queryKey: fullQueryKey,
    queryFn: ({ pageParam, signal }: { pageParam: CursorPageParam | null; signal: AbortSignal }) => {
      return fetchFunction({
        size,
        filters,
        ...pageParam,
        sortBy,
      }, signal);
    },
    getNextPageParam: (lastPage: T[]) => {
      if (!lastPage || lastPage.length === 0 || lastPage.length < size) {
        return undefined;
      }

      const lastItem = lastPage[lastPage.length - 1];

      const [productField, cursorField] = productSortFields[sortBy];
      return { lastId: lastItem.id, [cursorField]: lastItem[productField] };
    },
    initialPageParam: null,
    initialData,
    initialDataUpdatedAt,
    enabled,
    staleTime,
    ...(refetchOnWindowFocus !== undefined ? { refetchOnWindowFocus } : {}),
    ...(retry !== undefined ? { retry } : {}),
  });

  const { fetchNextPage: requestNextPage } = query;
  const fetchNextPage = useCallback(async (...args: Parameters<typeof requestNextPage>) => {
    const result = await requestNextPage(...args);
    setFailedPageKey(previous => result.isError ? queryHash : previous === queryHash ? null : previous);
    return result;
  }, [requestNextPage, queryHash]);

  const hasNextPageError = query.isFetchNextPageError || failedPageKey === queryHash;
  return {
    ...query,
    fetchNextPage,
    hasNextPageError,
    isLoadMoreBlocked: query.isFetching || (query.isError && !hasNextPageError),
  };
};
