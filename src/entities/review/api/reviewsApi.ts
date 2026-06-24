import { authClient } from "@/shared/api";
import type { CreateReviewInput } from "../model/types";

const API_URL = "/reviews";

export const reviewsApi = {
  create: async (input: CreateReviewInput): Promise<void> => {
    await authClient.post(API_URL, input);
  },
};
