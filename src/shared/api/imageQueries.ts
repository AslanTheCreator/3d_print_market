import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ImageMetadata, ImageResponse } from "@/shared/types";
import { imageApi } from "./imageApi";

const IMAGE_QUERY_KEY = "images";
const IMAGE_METADATA_QUERY_KEY = "imageMetadata";

const normalizeImageIds = (imageIds: number | number[] | null | undefined) => {
  if (!imageIds) {
    return [];
  }

  const ids = Array.isArray(imageIds) ? imageIds : [imageIds];

  return ids.filter((id) => id > 0);
};

export const useImagesQuery = (
  imageIds: number | number[] | null | undefined,
) => {
  const normalizedIds = useMemo(() => normalizeImageIds(imageIds), [imageIds]);

  return useQuery<ImageResponse[]>({
    queryKey: [IMAGE_QUERY_KEY, ...normalizedIds],
    queryFn: () => imageApi.getImages(normalizedIds),
    enabled: normalizedIds.length > 0,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
};

export const useImageMetadataQuery = (
  imageIds: number | number[] | null | undefined,
) => {
  const normalizedIds = useMemo(() => normalizeImageIds(imageIds), [imageIds]);

  return useQuery<ImageMetadata[]>({
    queryKey: [IMAGE_METADATA_QUERY_KEY, ...normalizedIds],
    queryFn: () => imageApi.getImageMetadata(normalizedIds),
    enabled: normalizedIds.length > 0,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
};
