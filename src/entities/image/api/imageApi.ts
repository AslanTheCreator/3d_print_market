import axios, { AxiosError } from "axios";
import config from "@/shared/config/api";
import { ImageResponse } from "../model/types";

const IMAGE_API_URL = `${config.apiBaseUrl}/images`;

export const getImages = async (
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
