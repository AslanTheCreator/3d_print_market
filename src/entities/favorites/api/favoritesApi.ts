import { Product } from "@/entities/product";
import { ProductFilter, SortBy } from "@/entities/product/model/types";
import { fetchProductsWithImages } from "@/shared/api";
import { authClient } from "@/shared/api";

const API_URL = `/favorites`;

export const favoritesApi = {
  getFavorites: async (
    size: number = 100,
    filters?: ProductFilter,
    lastCreatedAt?: string,
    lastPrice?: number,
    lastId?: number,
    sortBy: SortBy = "DATE_DESC",
  ): Promise<Product[]> => {
    return fetchProductsWithImages(
      authClient,
      `${API_URL}/find`,
      size,
      filters,
      lastCreatedAt,
      lastPrice,
      lastId,
      sortBy,
      "Ошибка при загрузке избранных товаров",
    );
  },
  addToFavorites: async (productId: number) => {
    await authClient.post(`${API_URL}?productId=${productId}`);
  },
  removeFromFavorites: async (productId: number) => {
    await authClient.delete(`${API_URL}?productId=${productId}`);
  },
};
