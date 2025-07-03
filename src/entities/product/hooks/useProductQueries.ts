import { useQuery } from "@tanstack/react-query";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";
import { ProductDetailsModel } from "../model/types"; // For return type

// Note: The getProducts function is complex and uses infinite scrolling paradigm
// in app/page.tsx via useCardsInfinite from features/product.
// That hook (useCardsInfinite) would be the place for useInfiniteQuery for products list.
// Here we only include useProductById as it was in the original queries.tsx.

export const useProductById = (id: string) => {
  return useQuery<ProductDetailsModel>({ // Specify return type
    queryKey: productKeys.detail(id), // Use new queryKeys
    queryFn: () => productApi.getProductById(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};
