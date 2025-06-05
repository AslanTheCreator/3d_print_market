import config from "@/shared/config/api";
import { CartProductModel } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { imageApi } from "@/entities/image/api/imageApi";

const authenticatedAxios = createAuthenticatedAxiosInstance();

export const cartApi = {
  getCart: async (): Promise<CartProductModel[]> => {
    try {
      const { data } = await authenticatedAxios.post<CartProductModel[]>(
        `${config.apiBaseUrl}/basket/find`,
        {}
      );

      if (!Array.isArray(data)) {
        console.error("Ошибка: сервер вернул некорректный формат данных", data);
        throw new Error("Некорректный формат данных от сервера");
      }

      return Promise.all(
        data.map(async (product) => {
          const images =
            product.imageId !== undefined
              ? await imageApi.getImages(product.imageId)
              : [];
          return { ...product, image: images };
        })
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузке товаров из корзины"
      );
    }
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
