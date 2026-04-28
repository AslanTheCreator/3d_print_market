import type { ImageResponse, ImageTag } from "@/shared/types";
import { publicClient, authClient } from "@/shared/api";

const API_URL = `/images`;

const getImagesBatch = async (imageIds: number[]): Promise<ImageResponse[]> => {
  const queryString = imageIds.map((id) => `ids=${id}`).join("&");
  const { data } = await publicClient.get<ImageResponse[]>(
    `${API_URL}?${queryString}`,
  );

  return data || [];
};

const getImagesInRequestedOrder = async (
  imageIds: number[],
): Promise<ImageResponse[]> => {
  const images = await Promise.all(
    imageIds.map(async (imageId) => {
      try {
        const [image] = await getImagesBatch([imageId]);
        return image ?? null;
      } catch (error) {
        console.error(`Failed to load image ${imageId}:`, error);
        return null;
      }
    }),
  );

  return images.filter((image): image is ImageResponse => !!image);
};

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
      if (validIds.length === 1) {
        return getImagesBatch(validIds);
      }

      return getImagesInRequestedOrder(validIds);
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
