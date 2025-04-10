import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import config from "@/shared/config/api";
import { errorHandler } from "@/shared/lib/errorHandler";

export const favoritesApi = {
  addToFavorites: async (productId: number) => {
    try {
      const authenticatedAxios = createAuthenticatedAxiosInstance();
      await authenticatedAxios.post(
        `${config.apiBaseUrl}/favorites?productId=${productId}`
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при добавлении товара в избранное"
      );
    }
  },
};
