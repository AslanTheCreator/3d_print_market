import { usePrivateMutation } from "@/shared/lib/query";
import { reviewsApi } from "../api/reviewsApi";
import type { CreateReviewInput } from "./types";

export const useCreateReview = () => {
  return usePrivateMutation({
    mutationFn: (input: CreateReviewInput) => reviewsApi.create(input),
    networkMode: "always",
    retry: false,
  });
};
