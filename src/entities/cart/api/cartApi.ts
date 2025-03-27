import config from "@/shared/config/api";
import axios from "axios";
import { CartProductModel, CartResponseModel } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";

export const cartApi = {
  async getCartProducts(authToken: string): Promise<CartProductModel[]> {
    if (!authToken) {
      throw new Error("Требуется токен для авторизации");
    }

    try {
      const { data } = await axios.post<CartResponseModel[]>(
        `${config.apiBaseUrl}/basket/find`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
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
