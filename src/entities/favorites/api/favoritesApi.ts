import { ProductCardModel } from "@/entities/product";
import { ProductFilter, SortBy } from "@/entities/product/model/types";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { fetchProductsWithImages } from "@/shared/api";
import { errorHandler } from "@/shared/lib/error-handler";

import "@/shared/config/axiosInterceptor";

const API_URL = `/favorites`;
const authenticatedAxios = createAuthenticatedAxiosInstance();

export const favoritesApi = {
  getFavorites: async (
    size: number = 100,
    filters?: ProductFilter,
    lastCreatedAt?: string,
    lastPrice?: number,
    lastId?: number,
    sortBy: SortBy = "DATE_DESC"
  ): Promise<ProductCardModel[]> => {
    return fetchProductsWithImages(
      authenticatedAxios,
      `${API_URL}/find`,
      size,
      filters,
      lastCreatedAt,
      lastPrice,
      lastId,
      sortBy,
      "Ошибка при загрузке избранных товаров"
    );
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
