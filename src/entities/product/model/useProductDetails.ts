import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useProductById } from "./useProductQueries";
import { ProductDetail } from "@/shared/types";

interface UseProductDetailsOptions {
  productId?: string;
  initialProduct?: ProductDetail;
  initialDataUpdatedAt?: number;
  initialError?: boolean;
}

interface UseProductDetailsReturn {
  productCard: ProductDetail | undefined;
  allImages: string[];
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

  const mainImage = useMemo(() => {
    const firstImage = productCard?.image[0];
    return firstImage?.url;
  }, [productCard?.image]);

  const additionalImages = useMemo(() => {
    return productCard?.image?.slice(1)?.map((img) => img.url) ?? [];
  }, [productCard?.image]);

  const allImages = mainImage
    ? [mainImage, ...additionalImages]
    : additionalImages;

  return {
    productCard,
    allImages,
    isLoading,
    error,
    isError: initialError || isError,
  };
};
