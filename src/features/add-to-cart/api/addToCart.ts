import config from "@/shared/config/api";
import axios from "axios";

export const addToCart = async (
  authToken: string,
  productId: number
): Promise<void> => {
  if (!authToken) {
    throw new Error("Токен авторизации отсутствует.");
  }
  if (!productId) {
    throw new Error("Идентификатор продукта отсутствует.");
  }

  try {
    const response = await axios.post(
      `${config.apiBaseUrl}/basket?productId=${productId}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `Не удалось добавить товар в корзину. Статус: ${response.status}`
      );
    }
  } catch (error) {
    throw error;
  }
};
