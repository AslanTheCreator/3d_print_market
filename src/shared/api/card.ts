import axios, { AxiosError } from "axios";
import { CardResponse, ImageResponse, CardItem } from "./types";
import config from "../../../config";

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

const API_URL = `${config.apiBaseUrl}/products/find`;
const IMAGE_API_URL = `${config.apiBaseUrl}/images`;

export const fetchImages = async (
  imageIds: number | number[]
): Promise<ImageResponse[]> => {
  try {
    const params = Array.isArray(imageIds)
      ? imageIds.map((id) => `ids=${id}`).join("&")
      : `ids=${imageIds}`;
    const { data } = await axios.get<ImageResponse[]>(
      `${IMAGE_API_URL}?${params}`
    );
    return data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Ошибка загрузки изображения(ий) ${imageIds}:`, axiosError);
    return [];
  }
};

export const fetchCards = async (token: string): Promise<CardItem[]> => {
  try {
    const { data } = await axios.post<CardResponse>(
      API_URL,
      {},
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

    console.log("Cards received:", cards);

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
