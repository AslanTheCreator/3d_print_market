import { ProductCardModel, ProductResponseModel } from "@/entities/product";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import config from "@/shared/config/api";
import { errorHandler } from "@/shared/lib/errorHandler";

const API_URL = `${config.apiBaseUrl}/favorites`;
const authenticatedAxios = createAuthenticatedAxiosInstance();

export const favoritesApi = {
  getFavorites: async (): Promise<ProductCardModel[]> => {
    try {
      const { data } = await authenticatedAxios.post<ProductResponseModel>(
        `${API_URL}/find`,
        {}
      );
      return data.content;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузке избранных товаров"
      );
    }
  },
  addToFavorites: async (productId: number) => {
    try {
      await authenticatedAxios.post(`${API_URL}?productId=${productId}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при добавлении товара в избранное"
      );
    }
  },
  removeFromFavorites: async (productId: number) => {
    try {
      await authenticatedAxios.delete(`${API_URL}?productId=${productId}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при удалении товара из избранного"
      );
    }
  },
};
