import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useProductById } from "./useProductQueries";
import { getImageUrl } from "@/shared/lib";
import { ProductDetail } from "@/shared/types";
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
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export const useProductDetails = ({
  productId,
  initialProduct,
  initialDataUpdatedAt,
  initialError = false,
}: UseProductDetailsOptions = {}): UseProductDetailsReturn => {
  const params = useParams();
  const id = productId ?? (params.id as string);

  const {
    data: productCard,
    isLoading,
    error,
    isError,
  } = useProductById(id, {
    initialProduct,
    initialDataUpdatedAt,
    enabled: !initialError,
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
    isLoading,
    error,
    isError: initialError || isError,
  };
};
