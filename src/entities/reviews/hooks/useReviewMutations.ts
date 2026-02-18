// entities/reviews/hooks/useReviewMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewsApi } from "../api/reviewsApi";
import { reviewsQueryKeys } from "./queryKeys";
import type { ReviewCreate } from "../model/types";

export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReviewCreate) => reviewsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.all });
    },
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: number) => reviewsApi.delete(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewsQueryKeys.all });
    },
  });
};
