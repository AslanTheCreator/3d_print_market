import axios, { AxiosError } from "axios";
import {
  ProductResponseModel,
  ProductCardModel,
  ProductDetailsModel,
} from "../model/types";
import config from "@/shared/config/api";
import { getImages } from "@/entities/image/api/imageApi";

const API_URL = `${config.apiBaseUrl}/products/find`;

export const getProducts = async (
  page: number,
  size: number
): Promise<ProductCardModel[]> => {
  try {
    const { data } = await axios.post<ProductResponseModel>(
      API_URL,
      {
        pageable: {
          size,
          page,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const cards = data.content;
    if (!Array.isArray(cards)) {
      console.error("Ошибка: сервер вернул некорректный формат данных", data);
      throw new Error("Некорректный формат данных от сервера");
    }

    return Promise.all(
      cards.map(async (card) => {
        const images =
          card.imageId !== undefined ? await getImages(card.imageId) : [];
        return { ...card, image: images };
      })
    );
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(
      `Ошибка запроса: ${axiosError.response?.status || "Неизвестно"} - ${
        axiosError.message
      }`
    );
    throw new Error("Ошибка при загрузке карточек");
  }
};

export const getProductById = async (
  id: string,
  token?: string
): Promise<ProductDetailsModel> => {
  try {
    const { data } = await axios.get<ProductDetailsModel>(
      `${config.apiBaseUrl}/product/${id}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (!data || !data.imageIds) {
      console.error("Ошибка: некорректные данные товара", data);
      throw new Error("Некорректные данные товара");
    }

    const images = await getImages(data.imageIds);
    return { ...data, image: images };
  } catch (error) {
    console.error("Ошибка при получении данных о товаре:", error);
    throw error;
  }
};
