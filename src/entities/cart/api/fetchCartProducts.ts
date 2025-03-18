import { CardItem, CardResponse } from "@/entities/product";
import config from "@/shared/config/api";
import axios from "axios";

export const fetchCartProducts = async (
  authToken: string
): Promise<CardItem[]> => {
  if (!authToken) {
    throw new Error("fetchCartProducts: требуется токен для авторизации");
  }

  try {
    const { data, status } = await axios.post<CardResponse[]>(
      `${config.apiBaseUrl}/basket/find`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (status !== 200) {
      throw new Error(
        `fetchCartProducts: Unable to fetch products from cart, status: ${status}`
      );
    }

    return data[0].content ?? [];
  } catch (error) {
    console.error("fetchCartProducts error:", error);
    throw new Error("fetchCartProducts: произошла непредвиденная ошибка");
  }
};
