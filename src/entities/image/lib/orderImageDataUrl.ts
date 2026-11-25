import type { ImageResponse } from "../model/types";

const IMAGE_CONTENT_TYPE_PATTERN = /^image\/[a-z0-9.+-]+$/i;
const BASE64_PATTERN =
  /^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}(?:==)?|[a-z0-9+/]{3}=?)?$/i;

const isImageResponse = (value: unknown): value is ImageResponse => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const image = value as Partial<ImageResponse>;

  return (
    typeof image.contentType === "string" &&
    typeof image.imageData === "string"
  );
};

export const toOrderImageDataUrl = (image: unknown): string | null => {
  if (!isImageResponse(image)) {
    return null;
  }

  const contentType = image.contentType.trim().toLowerCase();
  const imageData = image.imageData.replace(/\s/g, "");

  if (
    !IMAGE_CONTENT_TYPE_PATTERN.test(contentType) ||
    !imageData ||
    !BASE64_PATTERN.test(imageData)
  ) {
    return null;
  }

  return `data:${contentType};base64,${imageData}`;
};
