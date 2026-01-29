import { useQuery } from "@tanstack/react-query";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";
import { ProductDetail } from "../model/types";
import { ProductFilter, SortBy } from "@/shared/types";
import { useInfiniteProducts } from "@/shared/hooks/useInfiniteProducts";

export const useProductById = (id: string) => {
  return useQuery<ProductDetail>({
    queryKey: productKeys.detail(id),
    queryFn: () => productApi.getProductById(Number(id)),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useProductsInfinite = (
  size: number,
  filters?: ProductFilter,
  sortBy?: SortBy,
) => {
  return useInfiniteProducts({
    size,
    filters,
    sortBy,
    fetchFunction: productApi.getProducts,
    queryKey: ["products"],
  });
};

export const useUserProductsInfinite = (
  size: number,
  filters?: ProductFilter,
  sortBy?: SortBy,
) => {
  return useInfiniteProducts({
    size,
    filters,
    sortBy,
    fetchFunction: productApi.getUserProducts,
    queryKey: ["userProducts"],
  });
};
