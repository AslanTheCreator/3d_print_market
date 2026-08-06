import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useProductById } from "./useProductQueries";
import { getImageUrl } from "@/shared/lib";
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
    error,
    isError: initialError || isError,
  };
};
