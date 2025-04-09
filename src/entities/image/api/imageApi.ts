import axios from "axios";
import config from "@/shared/config/api";
import { ImageResponse, ImageTag } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";

const IMAGE_API_URL = `${config.apiBaseUrl}/images`;

export const imageApi = {
  async getImages(imageIds: number | number[]): Promise<ImageResponse[]> {
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
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при получении изображений"
      );
    }
  },
  async saveImage(file: File, tag: ImageTag): Promise<number[]> {
    const authenticatedAxios = createAuthenticatedAxiosInstance();

    const formData = new FormData();
    formData.append("files", file);

    try {
      const { data } = await authenticatedAxios.post<number[]>(
        `${IMAGE_API_URL}?tag=${tag}`,
        formData
      );
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузке изображений"
      );
    }
  },
};
