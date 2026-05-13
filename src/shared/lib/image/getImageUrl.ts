import type { ImageMetadata } from "@/shared/types";

export type ImageSize = "thumbnail" | "medium" | "original";

export const getImageUrl = (
  image: ImageMetadata | null | undefined,
  size: ImageSize,
): string | undefined => {
  if (!image) {
    return undefined;
  }

  if (size === "thumbnail") {
    return (
      image.thumbnailUrl ?? image.mediumUrl ?? image.originalUrl ?? image.url
    );
  }

  if (size === "original") {
    return (
      image.originalUrl ?? image.mediumUrl ?? image.thumbnailUrl ?? image.url
    );
  }

  return image.mediumUrl ?? image.originalUrl ?? image.thumbnailUrl ?? image.url;
};
