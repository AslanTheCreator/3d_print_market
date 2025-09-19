import { ProductCardModel } from "@/entities/product";
import { ProductFilter, SortBy } from "@/entities/product/model/types";
import { fetchProductsWithImages } from "@/shared/api";
import { errorHandler } from "@/shared/lib/error-handler";
import { authApi } from "@/shared/api";

const API_URL = `/favorites`;

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
      authApi,
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
      await authApi.post(`${API_URL}?productId=${productId}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при добавлении товара в избранное"
      );
    }
  },
  removeFromFavorites: async (productId: number) => {
    try {
      await authApi.delete(`${API_URL}?productId=${productId}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при удалении товара из избранного"
      );
    }
  },
};
