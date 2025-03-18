import { CardItem, CardResponse } from "@/entities/product";
import config from "@/shared/config/api";
import axios from "axios";

export const fetchCartProducts = async (
  authToken: string
): Promise<CardItem[]> => {
  if (!authToken) {
    throw new Error("Требуется токен для авторизации");
  }

  try {
    const { data } = await axios.post<CardResponse[]>(
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
