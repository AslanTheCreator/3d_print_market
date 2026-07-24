import { authClient, publicClient } from "@/shared/api";
import type { ImageMetadata, ImageResponse, ImageTag } from "../model/types";

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
      const [image] = await getImagesBatch([imageId]);
      return image ?? null;
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

    if (validIds.length === 1) {
      return getImagesBatch(validIds);
    }

    return getImagesInRequestedOrder(validIds);
  },
  async getImageMetadata(
    imageIds: number | number[] | null,
  ): Promise<ImageMetadata[]> {
    const validIds = normalizeImageIds(imageIds);

    if (validIds.length === 0) {
      return [];
    }

    return getMetadataBatch(validIds);
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
  async deleteImages(imageIds: number[], tag: ImageTag): Promise<void> {
    if (imageIds.length === 0) {
      return;
    }

    const params = new URLSearchParams();
    imageIds.forEach((imageId) => params.append("ids", String(imageId)));
    params.set("tag", tag);

    await authClient.delete(`${API_URL}?${params.toString()}`);
  },
};
