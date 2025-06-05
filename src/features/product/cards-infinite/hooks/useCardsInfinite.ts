import { productApi } from "@/entities/product";
import {
  ProductCardModel,
  ProductFilter,
} from "@/entities/product/model/types";
import { useInfiniteQuery } from "@tanstack/react-query";

interface CursorPageParam {
  lastCreatedAt: string;
  lastPrice: number;
  lastId: number;
}

export const useCardsInfinite = (size: number, filters?: ProductFilter) => {
  return useInfiniteQuery({
    queryKey: ["cards", size, filters],
    queryFn: ({ pageParam }: { pageParam: CursorPageParam | null }) => {
      const { lastCreatedAt, lastPrice, lastId } = pageParam || {};

      return productApi.getProducts(
        size,
        filters,
        lastCreatedAt,
        lastPrice,
        lastId
      );
    },
    getNextPageParam: (lastPage: ProductCardModel[], allPages) => {
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
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
};
