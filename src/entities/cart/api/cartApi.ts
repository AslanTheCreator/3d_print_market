import config from "@/shared/config/api";
import { CartProductModel, CartResponseModel } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { imageApi } from "@/entities/image/api/imageApi";

export const cartApi = {
  getCart: async (): Promise<CartProductModel[]> => {
    const authenticatedAxios = createAuthenticatedAxiosInstance();
    try {
      const { data } = await authenticatedAxios.post<CartResponseModel>(
        `${config.apiBaseUrl}/basket/find`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const products = data.content;

      if (!Array.isArray(products)) {
        console.error("Ошибка: сервер вернул некорректный формат данных", data);
        throw new Error("Некорректный формат данных от сервера");
      }

      return Promise.all(
        products.map(async (product) => {
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
