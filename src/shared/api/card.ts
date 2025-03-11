import axios, { AxiosError } from "axios";
import { useInfiniteQuery, QueryFunctionContext } from "@tanstack/react-query";
import { CardResponse, ImageResponse, CardItem } from "./types";
import config from "../../../config";

const API_URL = `${config.apiBaseUrl}/products/find`;
const IMAGE_API_URL = `${config.apiBaseUrl}/images`;

export async function authenticate(
  login: string,
  password: string
): Promise<string> {
  try {
    const { data } = await axios.post(`${config.apiBaseUrl}/auth/login`, {
      login,
      password,
    });
    return data.access_token;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error(
      "Authentication failed:",
      axiosError.response?.data || axiosError.message
    );
    throw axiosError;
  }
}

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

export const fetchCards = async (
  page: number,
  size: number
): Promise<CardItem[]> => {
  try {
    const { data } = await axios.post<CardResponse>(
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
): Promise<CardItem> => {
  try {
    const response = await axios.get<CardItem>(
      `${config.apiBaseUrl}/product/${id}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    const product = response.data;

    if (!product || !product.imageIds) {
      console.error("Ошибка: некорректные данные товара", product);
      throw new Error("Некорректные данные товара");
    }

    const images = await fetchImages(product.imageIds);
    return { ...product, image: images };
  } catch (error) {
    console.error("Ошибка при получении данных о товаре:", error);
    throw error;
  }
};

export const useCardsInfinite = (size: number) => {
  return useInfiniteQuery({
    queryKey: ["cards", size],
    queryFn: ({ pageParam }) => fetchCards(pageParam, size),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length > 0 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
};
