import { CartProductModel } from "../model/types";
import { authClient } from "@/shared/api";
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
    sortBy: SortBy = "DATE_DESC",
  ): Promise<CartProductModel[]> => {
    return fetchProductsWithImages(
      authClient,
      `${API_URL}/find`,
      size,
      filters,
      lastCreatedAt,
      lastPrice,
      lastId,
      sortBy,
      "Ошибка при загрузке товаров из корзины",
    ) as Promise<CartProductModel[]>;
  },
  addToCart: async (productId: number, count: number) => {
    await authClient.post(`${API_URL}?productId=${productId}&count=${count}`);
  },

  update: async (productId: number, count: number) => {
    await authClient.put(`${API_URL}?productId=${productId}&count=${count}`);
  },

  removeFromCart: async (productId: number) => {
    await authClient.delete(`${API_URL}?productId=${productId}`);
  },
};
