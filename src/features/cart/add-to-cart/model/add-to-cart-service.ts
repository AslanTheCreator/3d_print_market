import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import config from "@/shared/config/api";
import { errorHandler } from "@/shared/lib/errorHandler";

export const addToCartService = {
  async addProduct(productId: number) {
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
};
