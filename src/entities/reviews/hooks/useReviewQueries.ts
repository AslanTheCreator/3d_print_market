import { useQuery } from "@tanstack/react-query";
import { reviewsApi } from "../api/reviewsApi";
import { reviewsQueryKeys } from "./queryKeys";

// Хук для получения отзывов продавца
export const useSellerReviews = (sellerId: number) => {
  return useQuery({
    queryKey: reviewsQueryKeys.seller(sellerId),
    queryFn: () => reviewsApi.getSeller(sellerId),
    enabled: !!sellerId,
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000,
  });
};
