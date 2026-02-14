import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewsApi } from "../api/reviewsApi";
import { reviewsQueryKeys } from "./queryKeys";
import { productKeys } from "@/entities/product/hooks/queryKeys";
import { orderQueryKeys } from "@/entities/order/hooks/queryKeys";
import type { ReviewCreate } from "../model/types";

export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReviewCreate) => reviewsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.details() });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.customerOrders(),
      });
    },
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: number) => reviewsApi.delete(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.details() });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};
