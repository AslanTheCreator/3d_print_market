import { productApi } from "@/entities/product";
import { useInfiniteQuery } from "@tanstack/react-query";

export const useCardsInfinite = (size: number) => {
  return useInfiniteQuery({
    queryKey: ["cards", size],
    queryFn: ({ pageParam }) => productApi.getProducts(pageParam, size),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length > 0 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
};
