import { imageApi } from "../api/imageApi";
import type { ImageMetadata } from "../model/types";

export const attachImages = async <T, R extends T & { image: ImageMetadata[] }>(
  items: T[],
  getImageId: (item: T) => number | undefined | null,
): Promise<R[]> => {
  const imageIds = items
    .map(getImageId)
    .filter((imageId): imageId is number => !!imageId && imageId > 0);

  const uniqueImageIds = [...new Set(imageIds)];
  const images = await imageApi.getImageMetadata(uniqueImageIds);
  const imageById = new Map(images.map((image) => [image.id, image]));

  return items.map((item) => {
    const imageId = getImageId(item);
    const image = imageId ? imageById.get(imageId) : undefined;

    return {
      ...item,
      image: image ? [image] : [],
    } as R;
  });
};
