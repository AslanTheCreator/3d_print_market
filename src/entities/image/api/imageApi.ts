import { authClient, publicClient } from "@/shared/api";
import type { ImageMetadata, ImageResponse, ImageTag, NonOrderImageTag } from "../model/types";

const API_URL = `/images`;

const requireNonOrderTag = (tag: ImageTag) => {
  if (tag === "ORDER") throw new Error("ORDER images require an order-bound upload and cannot be deleted");
};

const uploadImage = async (file: File, params: URLSearchParams, signal?: AbortSignal): Promise<number[]> => {
  const formData = new FormData();
  formData.append("files", file);
  const { data } = await authClient.post<number[]>(`${API_URL}?${params}`, formData, { signal });
  if (!Array.isArray(data) || data.length === 0 ||
    !data.every((id: unknown) => typeof id === "number" && Number.isSafeInteger(id) && id > 0)) {
    throw new Error("Invalid image upload response");
  }
  return data;
};

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
  signal?: AbortSignal,
): Promise<ImageMetadata[]> => {
  const { data } = await publicClient.get<ImageMetadata[]>(
    `${API_URL}/metadata?ids=${imageIds.join(",")}`,
    { signal },
  );
  const imageById = new Map((data ?? []).map((image) => [image.id, image]));

  return imageIds
    .map((imageId) => imageById.get(imageId))
    .filter((image): image is ImageMetadata => !!image);
};

export const imageApi = {
  async getOrderImages(ids: number[], signal?: AbortSignal): Promise<ImageResponse[]> {
    const validIds = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))];
    if (!validIds.length) return [];
    const params = new URLSearchParams();
    validIds.forEach(id => params.append("ids", String(id)));
    const { data } = await authClient.get<ImageResponse[]>(`${API_URL}?${params}`, { signal });
    if (!Array.isArray(data)) throw new Error("Invalid order images response");
    return data;
  },
  async saveOrderImage(file: File, orderId: number, signal?: AbortSignal): Promise<number[]> {
    if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error("Invalid order ID");
    return uploadImage(file, new URLSearchParams({ tag: "ORDER", entityId: String(orderId) }), signal);
  },
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
    signal?: AbortSignal,
  ): Promise<ImageMetadata[]> {
    const validIds = normalizeImageIds(imageIds);

    if (validIds.length === 0) {
      return [];
    }

    return getMetadataBatch(validIds, signal);
  },
  async saveImage(file: File, tag: NonOrderImageTag): Promise<number[]> {
    requireNonOrderTag(tag);
    return uploadImage(file, new URLSearchParams({ tag }));
  },
  async deleteImages(imageIds: number[], tag: NonOrderImageTag): Promise<void> {
    requireNonOrderTag(tag);
    if (imageIds.length === 0) {
      return;
    }

    const params = new URLSearchParams();
    imageIds.forEach((imageId) => params.append("ids", String(imageId)));
    params.set("tag", tag);

    await authClient.delete(`${API_URL}?${params.toString()}`);
  },
};
