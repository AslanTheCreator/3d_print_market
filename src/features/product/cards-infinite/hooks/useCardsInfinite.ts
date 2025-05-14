import { productApi } from "@/entities/product";
import { ProductFilter } from "@/entities/product/model/types";
import { useInfiniteQuery } from "@tanstack/react-query";

export const useCardsInfinite = (size: number, filters?: ProductFilter) => {
  return useInfiniteQuery({
    queryKey: ["cards", size, filters],
    queryFn: ({ pageParam }) =>
      productApi.getProducts(pageParam, size, filters),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length > 0 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
};
