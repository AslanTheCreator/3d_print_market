import { authClient } from "@/shared/api";

export interface CreateReviewInput {
  orderId: number;
  rating: number;
  comment: string;
}

const API_URL = "/reviews";

export const reviewsApi = {
  create: async (input: CreateReviewInput): Promise<void> => {
    await authClient.post(API_URL, input);
  },
};
