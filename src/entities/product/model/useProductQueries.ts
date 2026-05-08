import { useQuery } from "@tanstack/react-query";
import { productApi } from "../api/productApi";
import { productKeys } from "./queryKeys";
import type { Product, ProductDetail } from "@/shared/types";
import { ProductFilter, SortBy } from "@/shared/types";
import { useInfiniteProducts } from "@/shared/hooks";

interface ProductsInfiniteOptions {
  initialProducts?: Product[];
  enabled?: boolean;
}

export const useProductById = (id?: string) => {
  return useQuery<ProductDetail>({
    queryKey: productKeys.detail(id ?? 0),
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
  options?: ProductsInfiniteOptions,
) => {
  return useInfiniteProducts({
    size,
    filters,
    sortBy,
    fetchFunction: productApi.getProducts,
    queryKey: productKeys.lists(),
    initialData:
      options?.initialProducts !== undefined
        ? {
            pages: [options.initialProducts],
            pageParams: [null],
          }
        : undefined,
    enabled: options?.enabled,
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
    queryKey: productKeys.userLists(),
  });
};
