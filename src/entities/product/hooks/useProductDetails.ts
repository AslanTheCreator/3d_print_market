import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useProductById } from "./useProductQueries";
import { ProductDetailsModel } from "../model/types";
import { useUserByParams } from "@/entities/user/hooks/useUserQueries"; // Corrected import path

interface UseProductDetailsReturn {
  productCard: ProductDetailsModel | undefined;
  allImages: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  averageRating?: number;
  sellerName?: string;
}

export const useProductDetails = (): UseProductDetailsReturn => {
  const params = useParams();
  const id = params.id as string;

  const { data: productCard, isLoading, error, isError } = useProductById(id);
  const { data: user } = useUserByParams(productCard?.participantId);

  const mainImage = useMemo(() => {
    const firstImage = productCard?.image[0];
    return firstImage
      ? `data:${firstImage.contentType};base64,${firstImage.imageData}`
      : undefined;
  }, [productCard?.image]);

  const additionalImages = useMemo(() => {
    return (
      productCard?.image
        ?.slice(1)
        ?.map((img) => `data:${img.contentType};base64,${img.imageData}`) ?? []
    );
  }, [productCard?.image]);

  const allImages = mainImage
    ? [mainImage, ...additionalImages]
    : additionalImages;

  return {
    productCard,
    allImages,
    isLoading,
    error,
    isError,
    averageRating: user?.[0]?.averageRating,
    sellerName: user?.[0]?.login,
  };
};
