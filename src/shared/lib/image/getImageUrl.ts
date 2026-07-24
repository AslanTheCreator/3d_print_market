export type ImageSize = "thumbnail" | "medium" | "original";

export interface ImageUrlSource {
  thumbnailUrl?: string;
  mediumUrl?: string;
  originalUrl?: string;
  url?: string;
}

const PRODUCTION_STORAGE_HOST = "77.37.166.117:9000";

const normalizeImageUrl = (url: string | undefined): string | undefined => {
  if (url?.startsWith(`${PRODUCTION_STORAGE_HOST}/`)) {
    return `http://${url}`;
  }

  return url;
};

export const getImageUrl = (
  image: ImageUrlSource | null | undefined,
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
