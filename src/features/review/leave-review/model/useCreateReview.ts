import { useMutation } from "@tanstack/react-query";
import { reviewsApi, type CreateReviewInput } from "../api/reviewsApi";

export const useCreateReview = () => {
  return useMutation({
    mutationFn: (input: CreateReviewInput) => reviewsApi.create(input),
  });
};
