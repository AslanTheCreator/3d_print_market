import { imageApi } from "@/shared/api";
import type { ImageResponse } from "@/shared/types";

/**
 * Generic-хелпер: для массива элементов подгружает картинки по imageId
 */
export const attachImages = async <T, R extends T & { image: ImageResponse[] }>(
  items: T[],
  getImageId: (item: T) => number | undefined | null,
): Promise<R[]> => {
  return Promise.all(
    items.map(async (item) => {
      const imageId = getImageId(item);
      const images = imageId ? await imageApi.getImages(imageId) : [];
      return { ...item, image: images } as R;
    }),
  );
};
