import axios from "axios";
import { CardResponse, ImageResponse } from "./types";
import config from "../../../config";

export const fetchCards = async (): Promise<CardResponse[]> => {
  const API_URL = `${config.apiBaseUrl}/products/find`;
  const IMAGE_API_URL = `${config.apiBaseUrl}/images?ids=`;
  try {
    const response = await axios.post<CardResponse[]>(
      API_URL,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Получаем карточки товара
    const cards = response.data;

    // Для каждой карточки товара, делаем запрос на изображение по id
    const updatedCards = await Promise.all(
      cards.map(async (card) => {
        try {
          // Получаем изображение для каждой карточки
          const imageResponse = await axios.get<ImageResponse[]>(
            `${IMAGE_API_URL}${card.imageId}`
          );
          // Добавляем объект изображения к карточке
          const image = imageResponse.data;
          return { ...card, image }; // Возвращаем карточку с добавленным объектом изображения
        } catch (imageError) {
          console.error(
            `Ошибка при загрузке изображения для карточки ${card.id}: ${imageError}`
          );
          // Если ошибка при загрузке изображения, добавляем пустой объект изображения
          return { ...card, image: [] };
        }
      })
    );

    return updatedCards;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      // Можно добавить более подробную обработку ошибок
      throw new Error(
        `Ошибка запроса: ${err.response?.status} - ${err.message}`
      );
    } else {
      throw new Error("Неизвестная ошибка");
    }
  }
};
