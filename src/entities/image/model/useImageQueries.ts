import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivateScope } from "@/shared/lib/query";
import { imageApi } from "../api/imageApi";
import type { ImageMetadata, ImageResponse } from "./types";

const IMAGE_QUERY_KEY = "images";
const IMAGE_METADATA_QUERY_KEY = "imageMetadata";

export const useOrderImagesQuery = (orderId: number, imageIds: readonly number[]) => {
  const scope = usePrivateScope();
  const ids = [...new Set(imageIds.filter(id => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b);
  return useQuery({
    queryKey: scope.key(["orderImages", orderId, ...ids]),
    queryFn: ({ signal }) => {
      if (!scope.isCurrent() || !Number.isSafeInteger(orderId) || orderId <= 0) throw new Error("Order images are unavailable outside the current session");
      return imageApi.getOrderImages(ids, signal);
    },
    enabled: scope.id !== null && Number.isSafeInteger(orderId) && orderId > 0 && ids.length > 0,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
};

const normalizeImageIds = (
  imageIds: number | number[] | null | undefined,
) => {
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
  const normalizedIds = useMemo(
    () => [...new Set(normalizeImageIds(imageIds))].sort((a, b) => a - b),
    [imageIds],
  );

  return useQuery<ImageMetadata[]>({
    queryKey: [IMAGE_METADATA_QUERY_KEY, ...normalizedIds],
    queryFn: ({ signal }) => imageApi.getImageMetadata(normalizedIds, signal),
    enabled: normalizedIds.length > 0,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
};
