import { CartProductModel } from "../model/types";
import { errorHandler } from "@/shared/lib";
import { authApi } from "@/shared/api";
import { fetchProductsWithImages } from "@/shared/api";
import { ProductFilter, SortBy } from "@/entities/product/model/types";

const API_URL = `/basket`;

export const cartApi = {
  getCart: async (
    size: number = 100,
    filters?: ProductFilter,
    lastCreatedAt?: string,
    lastPrice?: number,
    lastId?: number,
    sortBy: SortBy = "DATE_DESC"
  ): Promise<CartProductModel[]> => {
    return fetchProductsWithImages(
      authApi,
      `${API_URL}/find`,
      size,
      filters,
      lastCreatedAt,
      lastPrice,
      lastId,
      sortBy,
      "Ошибка при загрузке товаров из корзины"
    ) as Promise<CartProductModel[]>;
  },
  addToCart: async (productId: number) => {
    try {
      await authApi.post(`${API_URL}?productId=${productId}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при добавлении товара в корзину"
      );
    }
  },

  removeFromCart: async (productId: number) => {
    try {
      await authApi.delete(`${API_URL}?productId=${productId}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при удалении товара");
    }
  },
};
