import type { ImageMetadata } from "@/shared/types";

export type ImageSize = "thumbnail" | "medium" | "original";

const PRODUCTION_STORAGE_HOST = "77.37.166.117:9000";

const normalizeImageUrl = (url: string | undefined): string | undefined => {
  if (url?.startsWith(`${PRODUCTION_STORAGE_HOST}/`)) {
    return `http://${url}`;
  }

  return url;
};

export const getImageUrl = (
  image: ImageMetadata | null | undefined,
  size: ImageSize,
): string | undefined => {
  if (!image) {
    return undefined;
  }

  if (size === "thumbnail") {
    return normalizeImageUrl(
      image.thumbnailUrl ?? image.mediumUrl ?? image.originalUrl ?? image.url,
    );
  }

  if (size === "original") {
    return normalizeImageUrl(
      image.originalUrl ?? image.mediumUrl ?? image.thumbnailUrl ?? image.url,
    );
  }

  return normalizeImageUrl(
    image.mediumUrl ?? image.originalUrl ?? image.thumbnailUrl ?? image.url,
  );
};
