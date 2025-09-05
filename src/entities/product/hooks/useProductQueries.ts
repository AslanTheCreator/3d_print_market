import { useQuery } from "@tanstack/react-query";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";
import { ProductDetailsModel, ProductFilter, SortBy } from "../model/types";
import { useInfiniteProducts } from "@/shared/hooks/useInfiniteProducts";

export const useProductById = (id: string) => {
  return useQuery<ProductDetailsModel>({
    queryKey: productKeys.detail(id),
    queryFn: () => productApi.getProductById(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useProductsInfinite = (
  size: number,
  filters?: ProductFilter,
  sortBy?: SortBy
) => {
  return useInfiniteProducts({
    size,
    filters,
    sortBy,
    fetchFunction: productApi.getProducts,
    queryKey: ["products"],
  });
};
