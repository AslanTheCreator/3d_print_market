import { authClient, publicClient } from "@/shared/api";
import { Review, ReviewCreate } from "../model/types";

const API_URL = "/reviews";

export const reviewsApi = {
  getSeller: async (id: number): Promise<Review[]> => {
    const { data } = await publicClient.get<Review[]>(
      `${API_URL}/seller/${id}`,
    );
    return data;
  },
  create: async (input: ReviewCreate): Promise<void> => {
    await authClient.post(API_URL, input);
  },
  delete: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}?reviewId=${id}`);
  },
};
