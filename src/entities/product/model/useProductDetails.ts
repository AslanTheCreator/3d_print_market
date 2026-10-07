import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useProductById } from "./useProductQueries";
import { productKeys } from "./queryKeys";
import { ProductNotFoundError } from "../lib/ProductNotFoundError";
import { getImageUrl, parsePositiveSafeInteger } from "@/shared/lib";
import type { ProductDetail } from "./types";
import type { ImageGalleryImage } from "@/shared/ui/image-gallery";

interface UseProductDetailsOptions {
  productId?: string;
  initialProduct?: ProductDetail;
  initialDataUpdatedAt?: number;
  initialError?: boolean;
}

interface UseProductDetailsReturn {
  productCard: ProductDetail | undefined;
  allImages: ImageGalleryImage[];
  isError: boolean;
  error: Error | null;
  isNotFound: boolean;
  refetch: () => Promise<unknown>;
  isFetching: boolean;
}

export const useProductDetails = ({
  productId,
  initialProduct,
  initialDataUpdatedAt,
  initialError = false,
}: UseProductDetailsOptions = {}): UseProductDetailsReturn => {
  const params = useParams();
  const id = productId ?? (params.id as string);
  const queryClient = useQueryClient();
  const [awaitingServerRecovery, setAwaitingServerRecovery] = useState(initialError);

  useEffect(() => {
    if (initialError) {
      setAwaitingServerRecovery(true);
      return;
    }
    const validId = parsePositiveSafeInteger(id);
    if (awaitingServerRecovery && initialProduct && validId !== null) {
      queryClient.setQueryData(productKeys.detail(validId), initialProduct, { updatedAt: initialDataUpdatedAt });
      setAwaitingServerRecovery(false);
    }
  }, [awaitingServerRecovery, id, initialError, initialProduct, initialDataUpdatedAt, queryClient]);

  const {
    data: productCard,
    error,
    isError,
    refetch,
    isFetching,
  } = useProductById(id, {
    initialProduct,
    initialDataUpdatedAt,
    enabled: !initialError && !awaitingServerRecovery,
  });

  const allImages = useMemo<ImageGalleryImage[]>(() => {
    return (
      productCard?.image
        .flatMap((image) => {
          const previewSrc = getImageUrl(image, "medium");

          if (!previewSrc) {
            return [];
          }

          const galleryImage: ImageGalleryImage = {
            previewSrc,
          };
          const thumbnailSrc = getImageUrl(image, "thumbnail");
          const originalSrc = getImageUrl(image, "original");

          if (thumbnailSrc) {
            galleryImage.thumbnailSrc = thumbnailSrc;
          }

          if (originalSrc) {
            galleryImage.originalSrc = originalSrc;
          }

          return [galleryImage];
        })
        ?? []
    );
  }, [productCard?.image]);

  return {
    productCard,
    allImages,
    error,
    refetch,
    isFetching,
    isError: initialError || isError,
    isNotFound: parsePositiveSafeInteger(id) === null || error instanceof ProductNotFoundError,
  };
};
