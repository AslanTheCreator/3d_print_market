import { useMutation } from "@tanstack/react-query";
import { reviewsApi } from "../api/reviewsApi";
import type { CreateReviewInput } from "./types";

export const useCreateReview = () => {
  return useMutation({
    mutationFn: (input: CreateReviewInput) => reviewsApi.create(input),
  });
};
