import { ImageResponse, ImageTag } from "../model/types";
import { errorHandler } from "@/shared/lib";
import { publicApi, authApi } from "@/shared/api";

const API_URL = `/images`;

export const imageApi = {
  async getImages(imageIds: number | number[]): Promise<ImageResponse[]> {
    if (!imageIds || (Array.isArray(imageIds) && imageIds.length === 0)) {
      console.warn("Передан пустой массив или некорректный ID.");
      return [];
    }

    try {
      const ids = Array.isArray(imageIds) ? imageIds : [imageIds];
      const queryString = ids.map((id) => `ids=${id}`).join("&");

      const { data } = await publicApi.get<ImageResponse[]>(
        `${API_URL}?${queryString}`
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
    const formData = new FormData();
    formData.append("files", file);

    try {
      const { data } = await authApi.post<number[]>(
        `${API_URL}?tag=${tag}`,
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
