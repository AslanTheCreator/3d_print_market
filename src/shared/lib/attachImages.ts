import { imageApi } from "@/shared/api";
import type { ImageResponse } from "@/shared/types";

/**
 * Generic-хелпер: для массива элементов подгружает картинки по imageId
 */
export const attachImages = async <T, R extends T & { image: ImageResponse[] }>(
  items: T[],
  getImageId: (item: T) => number | undefined | null,
): Promise<R[]> => {
  const imageIds = items
    .map(getImageId)
    .filter((imageId): imageId is number => !!imageId && imageId > 0);

  const uniqueImageIds = [...new Set(imageIds)];
  const imageEntries = await Promise.all(
    uniqueImageIds.map(async (imageId) => {
      const [image] = await imageApi.getImages(imageId);
      return [imageId, image] as const;
    }),
  );
  const imageById = new Map<number, ImageResponse>();

  imageEntries.forEach(([imageId, image]) => {
    if (image) {
      imageById.set(imageId, image);
    }
  });

  return items.map((item) => {
    const imageId = getImageId(item);
    const image = imageId ? imageById.get(imageId) : undefined;

    return {
      ...item,
      image: image ? [image] : [],
    } as R;
  });
};
