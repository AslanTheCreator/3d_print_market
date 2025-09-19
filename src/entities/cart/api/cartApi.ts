import { CartProductModel } from "../model/types";
import { errorHandler } from "@/shared/lib/error-handler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { fetchProductsWithImages } from "@/shared/api";
import { ProductFilter, SortBy } from "@/entities/product/model/types";

import "@/shared/config/axiosInterceptor";

const authenticatedAxios = createAuthenticatedAxiosInstance();

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
      authenticatedAxios,
      `/basket/find`,
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
      await authenticatedAxios.post(`/basket?productId=${productId}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при добавлении товара в корзину"
      );
    }
  },

  removeFromCart: async (productId: number) => {
    try {
      await authenticatedAxios.delete(`/basket?productId=${productId}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при удалении товара");
    }
  },
};
