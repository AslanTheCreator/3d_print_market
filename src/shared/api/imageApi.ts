import type { ImageMetadata, ImageResponse, ImageTag } from "@/shared/types";
import { publicClient, authClient } from "@/shared/api";

const API_URL = `/images`;

const normalizeImageIds = (imageIds: number | number[] | null) => {
  if (!imageIds || imageIds === 0) {
    return [];
  }

  const ids = Array.isArray(imageIds) ? imageIds : [imageIds];

  return ids.filter((id) => id > 0);
};

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

const getMetadataBatch = async (
  imageIds: number[],
): Promise<ImageMetadata[]> => {
  const { data } = await publicClient.get<ImageMetadata[]>(
    `${API_URL}/metadata?ids=${imageIds.join(",")}`,
  );
  const imageById = new Map((data ?? []).map((image) => [image.id, image]));

  return imageIds
    .map((imageId) => imageById.get(imageId))
    .filter((image): image is ImageMetadata => !!image);
};

export const imageApi = {
  async getImages(
    imageIds: number | number[] | null,
  ): Promise<ImageResponse[]> {
    const validIds = normalizeImageIds(imageIds);

    if (validIds.length === 0) {
      return [];
    }

    try {
      if (validIds.length === 1) {
        return await getImagesBatch(validIds);
      }

      return await getImagesInRequestedOrder(validIds);
    } catch (error) {
      console.error("Ошибка при получении изображений:", error);
      return [];
    }
  },
  async getImageMetadata(
    imageIds: number | number[] | null,
  ): Promise<ImageMetadata[]> {
    const validIds = normalizeImageIds(imageIds);

    if (validIds.length === 0) {
      return [];
    }

    try {
      return await getMetadataBatch(validIds);
    } catch (error) {
      console.error("Failed to load image metadata:", error);
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
