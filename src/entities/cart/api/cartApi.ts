import config from "@/shared/config/api";
import axios from "axios";
import { CartProductModel, CartResponseModel } from "../model/types";

export const getCartProducts = async (
  authToken: string
): Promise<CartProductModel[]> => {
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

    return data[0]?.content ?? [];
  } catch (error) {
    console.error("Ошибка при получении товаров корзины:", error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(
          `Ошибка сервера: ${error.response.status} ${error.response.statusText}`
        );
      } else if (error.request) {
        throw new Error("Ошибка сети: сервер не отвечает");
      }
    }

    throw new Error(
      "Произошла непредвиденная ошибка при получении товаров корзины"
    );
  }
};
