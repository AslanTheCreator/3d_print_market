import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { Product } from "@/shared/types";
import { FetchProductsParams, ProductFilter, SortBy } from "@/shared/types";

export interface CursorPageParam {
  lastCreatedAt?: string;
  lastPrice?: number;
  lastId?: number;
}

export interface ProductFetchFunction {
  (params: FetchProductsParams): Promise<Product[]>;
}

export interface UseInfiniteProductsOptions {
  size: number;
  filters?: ProductFilter;
  sortBy?: SortBy;
  fetchFunction: ProductFetchFunction;
  queryKey: readonly unknown[];
  staleTime?: number;
  retry?: number;
  initialData?: InfiniteData<Product[], CursorPageParam | null>;
  initialDataUpdatedAt?: number;
  enabled?: boolean;
}

/**
 * Универсальный хук для бесконечной прокрутки продуктов с курсорной пагинацией
 */
export const useInfiniteProducts = ({
  size,
  filters,
  sortBy = "DATE_DESC",
  fetchFunction,
  queryKey,
  staleTime = 1000 * 60 * 5,
  retry = 2,
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
    retry,
  });
};
