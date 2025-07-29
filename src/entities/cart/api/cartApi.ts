import config from "@/shared/config/api";
import { CartProductModel } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { fetchProductsWithImages } from "@/shared/api/common/productDataFetcher";
import { ProductFilter, SortBy } from "@/entities/product/model/types";

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
      `${config.apiBaseUrl}/basket/find`,
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
      await authenticatedAxios.post(
        `${config.apiBaseUrl}/basket?productId=${productId}`
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при добавлении товара в корзину"
      );
    }
  },

  removeFromCart: async (productId: number) => {
    try {
      await authenticatedAxios.delete(
        `${config.apiBaseUrl}/basket?productId=${productId}`
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при удалении товара");
    }
  },
};
