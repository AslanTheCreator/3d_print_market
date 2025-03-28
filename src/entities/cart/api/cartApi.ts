import config from "@/shared/config/api";
import { CartProductModel, CartResponseModel } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";

export const cartApi = {
  async getCartProducts(): Promise<CartProductModel[]> {
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
};
