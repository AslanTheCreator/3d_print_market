import { ImageResponse, ImageTag } from "../model/types";
import { publicClient, authClient } from "@/shared/api";

const API_URL = `/images`;

export const imageApi = {
  async getImages(
    imageIds: number | number[] | null,
  ): Promise<ImageResponse[]> {
    if (!imageIds || imageIds === 0) {
      return [];
    }

    const ids = Array.isArray(imageIds) ? imageIds : [imageIds];

    const validIds = ids.filter((id) => id > 0);

    if (validIds.length === 0) {
      return [];
    }

    try {
      const queryString = validIds.map((id) => `ids=${id}`).join("&");
      const { data } = await publicClient.get<ImageResponse[]>(
        `${API_URL}?${queryString}`,
      );

      return data || [];
    } catch (error) {
      console.error("Ошибка при получении изображений:", error);
      return [];
    }
  },
  async saveImage(file: File, tag: ImageTag): Promise<number[]> {
    const formData = new FormData();
    formData.append("files", file);

    const { data } = await authClient.post<number[]>(
      `${API_URL}?tag=${tag}`,
      formData,
    );
    return data;
  },
};
