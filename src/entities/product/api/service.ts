import axios, { AxiosError } from "axios";
import {
  ProductResponseModel,
  ProductCardModel,
  ProductDetailsModel,
} from "../model/types";
import config from "@/shared/config/api";
import { ImageResponse } from "@/entities/image/model/types";

const API_URL = `${config.apiBaseUrl}/products/find`;
const IMAGE_API_URL = `${config.apiBaseUrl}/images`;

export const fetchImages = async (
  imageIds: number | number[]
): Promise<ImageResponse[]> => {
  if (!imageIds || (Array.isArray(imageIds) && imageIds.length === 0)) {
    console.warn("Передан пустой массив или некорректный ID.");
    return [];
  }

  try {
    const ids = Array.isArray(imageIds) ? imageIds : [imageIds];
    const queryString = ids.map((id) => `ids=${id}`).join("&");

    const { data } = await axios.get<ImageResponse[]>(
      `${IMAGE_API_URL}?${queryString}`
    );

    return data;
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      console.error(
        `Ошибка загрузки изображений ${imageIds}. Код: ${axiosError.response.status}`
      );
    } else if (axiosError.request) {
      console.error(`Сервер не ответил на запрос изображений ${imageIds}.`);
    } else {
      console.error(`Ошибка при создании запроса изображений ${imageIds}.`);
    }

    return [];
  }
};

export const fetchProducts = async (
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
          card.imageId !== undefined ? await fetchImages(card.imageId) : [];
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

export const fetchProductById = async (
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

    const images = await fetchImages(data.imageIds);
    return { ...data, image: images };
  } catch (error) {
    console.error("Ошибка при получении данных о товаре:", error);
    throw error;
  }
};
