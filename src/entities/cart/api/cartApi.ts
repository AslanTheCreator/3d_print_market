import config from "@/shared/config/api";
import { CartProductModel, CartResponseModel } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";

export const cartApi = {
  getCart: async (): Promise<CartProductModel[]> => {
    const authenticatedAxios = createAuthenticatedAxiosInstance();
    try {
      const { data } = await authenticatedAxios.post<CartResponseModel[]>(
        `${config.apiBaseUrl}/basket/find`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return data[0].content ?? [];
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузке товаров из корзины"
      );
    }
  },
  addToCart: async (productId: number) => {
    try {
      const authenticatedAxios = createAuthenticatedAxiosInstance();

      const { data } = await authenticatedAxios.post(
        `${config.apiBaseUrl}/basket?productId=${productId}`
      );

      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при добавлении товара в корзину"
      );
    }
  },

  removeFromCart: async (productId: number) => {
    try {
      const authenticatedAxios = createAuthenticatedAxiosInstance();

      await authenticatedAxios.delete(
        `${config.apiBaseUrl}/basket?productId=${productId}`
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при удалении товара");
    }
  },
};
