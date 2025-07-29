import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ProductCardModel,
  ProductFilter,
  SortBy,
} from "@/entities/product/model/types";

export interface CursorPageParam {
  lastCreatedAt?: string;
  lastPrice?: number;
  lastId?: number;
}

export interface ProductFetchFunction {
  (
    size: number,
    filters?: ProductFilter,
    lastCreatedAt?: string,
    lastPrice?: number,
    lastId?: number,
    sortBy?: SortBy
  ): Promise<ProductCardModel[]>;
}

export interface UseInfiniteProductsOptions {
  size: number;
  filters?: ProductFilter;
  sortBy?: SortBy;
  fetchFunction: ProductFetchFunction;
  queryKey: string[];
  staleTime?: number;
  retry?: number;
}

export const useInfiniteProducts = ({
  size,
  filters,
  sortBy = "DATE_DESC",
  fetchFunction,
  queryKey,
  staleTime = 1000 * 60 * 5,
  retry = 2,
}: UseInfiniteProductsOptions) => {
  return useInfiniteQuery({
    queryKey: [...queryKey, size, filters, sortBy],
    queryFn: ({ pageParam }: { pageParam: CursorPageParam | null }) => {
      const { lastCreatedAt, lastPrice, lastId } = pageParam || {};

      return fetchFunction(
        size,
        filters,
        lastCreatedAt,
        lastPrice,
        lastId,
        sortBy
      );
    },
    getNextPageParam: (lastPage: ProductCardModel[]) => {
      // Если последняя страница пустая или меньше размера, больше страниц нет
      if (!lastPage || lastPage.length === 0 || lastPage.length < size) {
        return undefined;
      }

      // Берем данные последнего элемента для следующего запроса
      const lastItem = lastPage[lastPage.length - 1];

      return {
        lastCreatedAt: lastItem.createdAt,
        lastPrice: lastItem.price,
        lastId: lastItem.id,
      };
    },
    initialPageParam: null,
    staleTime,
    retry,
  });
};
